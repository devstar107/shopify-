const { WITH_AUTHENTICATION, APP_API_VERSION } = process.env

const ShopifyApi = require('shopify-api-node')

const { getStoreToken } = require('../../utils/redis')
const { slugify } = require('../../../lib/utils/misc')

const { synchronizeProduct, getInventoryItemStock } = require('../../utils/products')
const { getSelectedLocation } = require('../../utils/locations')


module.exports = (router, customRateLimit, storeExists, withAuthentication) => {
    //----------------------------------------------------------------
    //----- Products data
    //----------------------------------------------------------------

    // Get list of ALL shopify products
    router.get(`/api/${APP_API_VERSION}/:shop/products`, customRateLimit, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const accessToken = WITH_AUTHENTICATION == 'TRUE'
                ? ctx.req.headers['x-shopify-access-token']
                : await getStoreToken(`offline_${ctx.params.shop}.myshopify.com`)

            const shopifyApi = new ShopifyApi({
                shopName : ctx.params.shop,
                accessToken : accessToken,
                autoLimit : true
            })

            let products = []
            let productsInventoryItems = []
            const shouldFetchStock = !!(ctx.query && ctx.query.fields && ctx.query.fields == 'stock')

            let error = false

            await (async () => {
                let params = { limit: 250 }

                do {
                    const reqProducts = await shopifyApi.product.list(params)

                    if (reqProducts && reqProducts.length) {
                        products.push(...reqProducts)

                        reqProducts.forEach((reqProduct) => {
                            reqProduct.variants.forEach((variant) => {
                                productsInventoryItems.push(variant.inventory_item_id)
                            })
                        })
                    }

                    params = reqProducts.nextPageParameters
                } while (params !== undefined)
            })().catch((err) => {
                error = err
                console.log(`Api <GET> </products> : error <${err}>`)
            })
            
            if(!error) {
                let selectedLocationId = null

                // Only fetch selected location stocks if requested
                if(shouldFetchStock) {
                    const selectedLocation = await getSelectedLocation(ctx)

                    selectedLocationId = selectedLocation.selectedLocationId
                    error = selectedLocation.error
                }

                if(!error) {
                    if(shouldFetchStock) {
                        let inventoryLevels = []

                        await (async () => {
                            let params = { 
                                inventory_item_ids : productsInventoryItems.slice(0, 50).join(','),
                                location_ids : selectedLocationId,
                                limit: 50
                            }

                            do {
                                const reqInventoryLevels = await shopifyApi.inventoryLevel.list(params)
                                if (reqInventoryLevels && reqInventoryLevels.length)
                                    inventoryLevels.push(...reqInventoryLevels)

                                productsInventoryItems.splice(0, 50)
                                params = productsInventoryItems.length
                                    ? params
                                    : undefined
                            } while (params !== undefined)
                        })().catch((err) => {
                            error = err
                            console.log(`Api <GET> </:shop/products> <getInventoryLevels> : error <${err}>`)
                        })

                        if(!error) {
                            products = products.map((product) => {
                                product.variants.map((variant) => {
                                    const matchingIndex = inventoryLevels.findIndex((inventoryLevel) => inventoryLevel.inventory_item_id == variant.inventory_item_id)
                                    
                                    variant.selected_location_inventory_quantity = 
                                        matchingIndex != -1
                                        && inventoryLevels[matchingIndex] && inventoryLevels[matchingIndex].available
                                            ? inventoryLevels[matchingIndex].available
                                            : 0

                                    return variant
                                })

                                return product
                            })
                        }
                    }
                    
                    ctx.status = 200
                    ctx.body = { 
                        products : products.map((product) => {
                            return {
                                id : product.id,
                                title : product.title,
                                handle : product.handle,
                                variants : product.variants.map((variant) => {
                                    return {
                                        id : variant.id,
                                        title : variant.title,
                                        inventory_item_id : variant.inventory_item_id,
                                        inventory_quantity : variant.inventory_quantity,
                                        selected_location_inventory_quantity : shouldFetchStock ? variant.selected_location_inventory_quantity : null,
                                        options : variant.title.split(' / '),
                                    }
                                }) || [],
                                images : product.images
                            }
                        }) || [] 
                    }

                    return true 
                }
            }
            else {
                ctx.status = 500
                ctx.body = { error : error }
                return false 
            }
        }
    })

    // Get specific shopify product
    router.get(`/api/${APP_API_VERSION}/:shop/products/:productId`, customRateLimit, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const accessToken = WITH_AUTHENTICATION == 'TRUE'
                ? ctx.req.headers['x-shopify-access-token']
                : await getStoreToken(`offline_${ctx.params.shop}.myshopify.com`)

            const shopifyApi = new ShopifyApi({
                shopName : ctx.params.shop,
                accessToken : accessToken,
                autoLimit : true
            })

            let product = null
            let productInventoryItems = []
            const shouldFetchStock = !!(ctx.query && ctx.query.fields && ctx.query.fields == 'stock')

            let error = false

            await shopifyApi.product
                .get(ctx.params.productId)
                .then((scopedProduct) => {
                    product = scopedProduct

                    product.variants.forEach((variant) => {
                        productInventoryItems.push(variant.inventory_item_id)
                    })
                })
                .catch((err) => {
                    console.log(`Api <GET> </products/:productId> : error <${err}>`)
                    error = err
                })

            if (!error) {
                let selectedLocationId = null

                if(shouldFetchStock) {
                    // Get location
                    const selectedLocation = await getSelectedLocation(ctx)
                    
                    selectedLocationId = selectedLocation.selectedLocationId
                    error = selectedLocation.error
                }

                if(!error) {
                    if(shouldFetchStock) {
                        let inventoryLevels = []

                        await (async () => {
                            let params = { 
                                inventory_item_ids : productInventoryItems.slice(0, 50).join(','),
                                location_ids : selectedLocationId,
                                limit: 50
                            }

                            do {
                                const reqInventoryLevels = await shopifyApi.inventoryLevel.list(params)
                                if (reqInventoryLevels && reqInventoryLevels.length)
                                    inventoryLevels.push(...reqInventoryLevels)

                                    productInventoryItems.splice(0, 50)
                                params = productInventoryItems.length
                                    ? params
                                    : undefined
                            } while (params !== undefined)
                        })().catch((err) => {
                            error = err
                            console.log(`Api <GET> </:shop/products> <getInventoryLevels> : error <${err}>`)
                        })
                        
                        if(!error) {
                            product.variants = product.variants.map((variant) => {
                                const matchingIndex = inventoryLevels.findIndex((inventoryLevel) => {
                                    return inventoryLevel.inventory_item_id == variant.inventory_item_id
                                })
                                
                                variant.selected_location_inventory_quantity = 
                                    matchingIndex != -1
                                    && inventoryLevels[matchingIndex] && inventoryLevels[matchingIndex].available
                                        ? inventoryLevels[matchingIndex].available
                                        : 0

                                return variant
                            })
                        }
                    }

                    ctx.status = 200
                    ctx.body = {
                        id : product.id,
                        title : product.title,
                        handle : product.handle,
                        variants : product.variants.map((variant) => {
                            return {
                                id : variant.id,
                                title : variant.title,
                                inventory_item_id : variant.inventory_item_id,
                                inventory_quantity : variant.inventory_quantity,
                                selected_location_inventory_quantity : shouldFetchStock ? variant.selected_location_inventory_quantity : null,
                                options : variant.title.split(' / '),
                                image_id : variant.image_id
                            }
                        }) || [],
                        images : product.images
                    }

                    return true 
                }
            }
            else {
                ctx.status = 500
                ctx.body = { error : error }
                return false 
            }
        }
    })


    //----------------------------------------------------------------
    //----- Options & values
    //----------------------------------------------------------------

    // Get list of shopify options
    router.get(`/api/${APP_API_VERSION}/:shop/options`, customRateLimit, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const accessToken = WITH_AUTHENTICATION == 'TRUE'
                ? ctx.req.headers['x-shopify-access-token']
                : await getStoreToken(`offline_${ctx.params.shop}.myshopify.com`)

            const shopifyApi = new ShopifyApi({
                shopName : ctx.params.shop,
                accessToken : accessToken,
                autoLimit : true
            })

            let products = []
            let error = false

            await (async () => {
                let params = { limit: 250 }

                do {
                    const reqProducts = await shopifyApi.product.list(params)
                    if (reqProducts && reqProducts.length)
                        products.push(...reqProducts)

                    params = reqProducts.nextPageParameters
                } while (params !== undefined)
            })().catch((err) => {
                error = err
                console.log(`Api <GET> </options>: error <${err}>`)
            })

            if (!error) {
                let options = []

                products.forEach((product) => {
                    product.options.forEach((option) => {
                        // Prevent from option names duplication
                        if (options.indexOf(option.name) == -1)
                            options.push(option.name)
                    })
                })

                ctx.status = 200
                ctx.body = { options : options }
                return true 
            }
            else {
                ctx.status = 500
                ctx.body = { error : error }
                return false 
            }
        }
    })

    // Get list of all values from a specific option
    router.get(`/api/${APP_API_VERSION}/:shop/options/:option`, customRateLimit, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const accessToken = WITH_AUTHENTICATION == 'TRUE'
                ? ctx.req.headers['x-shopify-access-token']
                : await getStoreToken(`offline_${ctx.params.shop}.myshopify.com`)

            const shopifyApi = new ShopifyApi({
                shopName : ctx.params.shop,
                accessToken : accessToken,
                autoLimit : true
            })

            let products = []
            let error = false

            await (async () => {
                let params = { limit: 250 }

                do {
                    const reqProducts = await shopifyApi.product.list(params)
                    if (reqProducts && reqProducts.length)
                        products.push(...reqProducts)

                    params = reqProducts.nextPageParameters
                } while (params !== undefined)
            })().catch((err) => {
                error = err
                console.log(`Api <GET> </options> : error <${err}>`)
            })

            if (!error) {
                let values = []

                products.forEach((product) => {
                    product.options.forEach((option) => {
                        // If option name matches with our param we push it in array
                        if (slugify(option.name) == slugify(ctx.params.option))
                            option.values.forEach((value) => {
                                if (values.indexOf(value) == -1)
                                    values.push(value)
                            })
                    })
                })

                ctx.status = 200
                ctx.body = { values : values }
                return true 
            }
            else {
                ctx.status = 500
                ctx.body = { error : error }
                return false 
            }
        }
    })


    //----------------------------------------------------------------
    //----- Stocks
    //----------------------------------------------------------------

    router.get(`/api/${APP_API_VERSION}/:shop/products/:inventoryItemId/stock`, customRateLimit, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const { stock, error } = await getInventoryItemStock(ctx)

            if(!error) {        
                ctx.status = 200
                ctx.body = { stock : stock }
                return true 
            }
            else {
                ctx.status = 500
                ctx.body = { error : (error || '<No available inventory levels found for this parameter>') }
                return false 
            }
        }
    })

    router.put(`/api/${APP_API_VERSION}/:shop/products/:inventoryItemId/stock`, customRateLimit, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const accessToken = WITH_AUTHENTICATION == 'TRUE'
                ? ctx.req.headers['x-shopify-access-token']
                : await getStoreToken(`offline_${ctx.params.shop}.myshopify.com`)

            let error = false

            // Get location
            const selectedLocation = await getSelectedLocation(ctx)
                
            const { selectedLocationId } = selectedLocation
            error = selectedLocation.error

            if (!error) {
                const shopifyApi = new ShopifyApi({
                    shopName : ctx.params.shop,
                    accessToken : accessToken,
                    autoLimit : true
                })

            // If no error put inventory level
                const params = { 
                    inventory_item_id : ctx.params.inventoryItemId,
                    location_id : selectedLocationId,
                    available : ctx.request.body.stock
                }

                await shopifyApi.inventoryLevel
                    .set(params)
                    .catch((err) => {
                        console.log(`Api <PUT> </:shop/products/:inventoryItemId/stock> <setInventoryLevel> : error <${err}> with params <${JSON.stringify(params)}>`)
                        error = err
                    })

                if (!error) {
                    ctx.status = 204
                    ctx.response.body = { success : 204 }
                    return true 
                }
                else {
                    ctx.status = 422
                    ctx.response.body = { error : 'Unable to update selected inventoryLevel' }
                    return false 
                }
            }
        }
    })

    // Manual synchronization
    router.put(`/api/${APP_API_VERSION}/:shop/products/update`, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            if (
                ctx.request.body
                && ctx.request.body.productId
            ) {
                const productId = ctx.request.body.productId
                const variants = JSON.parse(ctx.request.body.variants)
                const shop = ctx.request.body.shop.replace('.myshopify.com', '')

                const accessToken = WITH_AUTHENTICATION == 'TRUE'
                    ? ctx.req.headers['x-shopify-access-token']
                    : await getStoreToken(`offline_${ctx.params.shop}.myshopify.com`)

                const synchronization = await synchronizeProduct(ctx, shop, accessToken, productId, variants)
                
                ctx.status = 200
                ctx.body = synchronization
                return true 
            }

            console.log(`Api <POST> </:shop/products/update> : error <No product id received>`)

            ctx.status = 422
            ctx.response.body = { error : 'Unable to process Api <POST> <products/update>' }
            return false 
        }
    })


    //----------------------------------------------------------------
    //----- Create product
    //----------------------------------------------------------------

    router.post(`/api/${APP_API_VERSION}/:shop/products/create`, customRateLimit, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const accessToken = WITH_AUTHENTICATION == 'TRUE'
                ? ctx.req.headers['x-shopify-access-token']
                : await getStoreToken(`offline_${ctx.params.shop}.myshopify.com`)

            const shopifyApi = new ShopifyApi({
                shopName : ctx.params.shop,
                accessToken : accessToken,
                autoLimit : true
            })

            const product = {
                title : 'EventsUnited Integration',
                body_html : 'This product only exists to help you set your marketplace integration up.',
                vendor : 'EventsUnited',
                product_type : 'Integration',
                published : false,
                variants : [
                    {
                        option1 : 'Size',
                        option2 : 'Print & Color'
                    }
                ],
                options : [
                    {
                        name : 'Size',
                        values : [
                            'Example size'
                        ]
                    },
                    {
                        name : 'Print & Color',
                        values : [
                            'Example print',
                            'Example color'
                        ]
                    }
                ]
            }

            let responseProduct = null
            let error = false

            await shopifyApi.product
                .create(product)
                .then((scopedProduct) => {
                    responseProduct = scopedProduct
                })
                .catch((err) => {
                    console.log(`Api <POST> </products/create> : error <${err}>`)
                    error = err
                })

            if (!error) {
                ctx.status = 200
                ctx.response.body = { productId : responseProduct.id }
                return true 
            }
            else {
                ctx.status = 500
                ctx.response.body = { error : error }
                return false 
            }
        }
    })
}