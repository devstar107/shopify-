const { MARKETPLACE_API_URL, WITH_AUTHENTICATION } = process.env
const ShopifyApi = require('shopify-api-node')
const axios = require('axios')

const { getStore, getStoreToken } = require('./redis')
const { getSelectedLocation } = require('./locations')
const { sleep } = require('../../lib/utils/misc')



exports.getMarketplacePlugin = async (shop) => {
    const store = await getStore(`offline_${shop}.myshopify.com`)
    const marketPlaceToken = store.marketPlaceToken

    if (marketPlaceToken) {
        const token = `Bearer ${marketPlaceToken}`

        let plugin = []

        await axios.get(`${MARKETPLACE_API_URL}/plugin`, {
            headers: {
                'Accept' : 'application/json',
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Authorization' : token
            }
        }).then((response) => {
            plugin = response.data
        }).catch((err) => {
            plugin = { error : err.response && err.response.status ? err.response.status : 'Marketplace plugin not found' }
        })

        return plugin
    }
    else 
        return { error : 429 }
}

exports.getMarketplaceProductParams = async (plugin, productId) => {
    const { products } = plugin

    let productParams = {}

    if (products && products.length) {
        products.some((product) => {
            if (product.id_foreign == productId)
                productParams = {
                    'id_product' : product.id_product,
                    'id_collection' : product.id_collection
                }
            return product.id_foreign == productId
        })
    }

    return productParams
}

exports.getMarketplacePossibleVariants = (plugin, variant) => {
    const variantOptions = variant.title.split(' / ')

    console.log(`Utils/Products <products/update> <getMarketplacePossibleVariants> : variantOptions <${variantOptions}>`)
    console.log(`Utils/Products <products/update> <getMarketplacePossibleVariants> : plugin.sizes <${JSON.stringify(plugin.sizes)}>`)
    console.log(`Utils/Products <products/update> <getMarketplacePossibleVariants> : plugin.variations <${JSON.stringify(plugin.variations)}>`)

    let sizesArr = []
    let variationsArr = []

    let possibleVariants = []

    // Get list of sizes and variations
    if (variantOptions && variantOptions.length) {
        variantOptions.forEach((option) => {
            // Map sizes
            if (plugin && plugin.sizes && plugin.sizes.length)
                plugin.sizes.forEach((size) => {
                    if (option == size.id_foreign)
                        sizesArr.push({ id_size : size['id_size'] })
                })

            // Map variations
            if (plugin && plugin.variations && plugin.variations.length)
                plugin.variations.forEach((variation) => {
                    if (option == variation.id_foreign) {
                        let variationObj = {}
                        variationObj[`id_${variation.type}`] = variation[`id_${variation.type}`]
                        variationsArr.push(variationObj)
                    }
                })
        })
    }

    // Create possible variations list from our arrays
    sizesArr.forEach((size) => {
        variationsArr.forEach((variation) => {
            possibleVariants.push({
                ...size,
                ...variation
            })
        })
    })

    console.log(`Utils/Products <products/update> <getMarketplacePossibleVariants> : possibleVariants <${JSON.stringify(possibleVariants)}>`)

    return possibleVariants
}

exports.putMarketplaceStocks = async (shop, variant, platformId, collectionId, productId, possibleVariant, stock) => {
    const store = await getStore(`offline_${shop}.myshopify.com`)
    const marketPlaceToken = store.marketPlaceToken

    if (marketPlaceToken) {
        const token = `Bearer ${marketPlaceToken}`

        let result = []

        let requestBody = {
            ...possibleVariant,
            id_platform : platformId,
            stock : stock
        }

        requestBody = Object.keys(requestBody).map((key) => {
            return encodeURIComponent(key) + '=' + encodeURIComponent(requestBody[key])
        }).join('&')

        await axios.put(`${MARKETPLACE_API_URL}/collections/${collectionId}/products/${productId}/stock/`, requestBody, {
            headers: {
                'Accept' : 'application/json',
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Authorization' : token
            }
        }).then((response) => {
            console.log(`Utils/Products <products/update> putMarketplaceStocks : variant <${variant.title}> success <204>`)
            result = {
                variant : variant.title,
                status : 'success',
                message : 'Success'
            }
        }).catch((err) => {
            console.log(`Utils/Products <products/update> putMarketplaceStocks : variant <${variant.title}> error <${err.message}>`)
            result = {
                variant : variant.title,
                status : 'warning',
                message : 'put_stock_error'
            }
        })

        return result
    }
    else {
        console.log(`Utils/Products <products/update> putMarketplaceStocks : variant <${variant.title}> error <Can't get marketplace token>`)

        return {
            variant : variant.title,
            status : 'critical',
            message : 'get_marketplace_token'
        }
    }
}

exports.recursiveUpdate = async (ctx, shop, shopifyApi, marketplacePlugin, pluginProductParams, variants, responseArr = []) => {
    if(!(variants && variants.length))
        return responseArr

    const variant = variants[0]
    const possibleVariants = await exports.getMarketplacePossibleVariants(marketplacePlugin, variant)

    const starting = Date.now()
    
    if (possibleVariants && possibleVariants.length) {
        const { stock, error } = await exports.getInventoryItemStock(ctx, shopifyApi, variant.inventory_item_id)

        if (!error) {
            // Prepare params to put stocks to marketplace
            const { id_platform } = marketplacePlugin.plugin
            const { id_collection, id_product } = pluginProductParams

            // Try each size until we have the right match
            await (async (possibleVariants) => {
                const possibleVariantsPromises = possibleVariants.map(async (possibleVariant) => {
                    const response = await exports.putMarketplaceStocks(
                        shop,
                        variant,
                        id_platform,
                        id_collection,
                        id_product,
                        possibleVariant,
                        stock
                    )

                    responseArr.push(response)
                })

                await Promise.all(possibleVariantsPromises)
            })(possibleVariants)
        }
        else {
            console.log(`Utils/Products <products/update> getStock inventoryItemId <${variant.inventory_item_id}> : error <${error}>`)

            responseArr.push({
                variant : variant.title,
                status : 'warning',
                message : 'get_stock_error'
            })
        }
    }
    else {
        console.log(`Utils/Products <products/update> : warning <No matching options for ${variant.title}>`)

        responseArr.push({
            variant : variant.title,
            status : 'warning',
            message : 'no_matching_options'
        })
    }

    const ending = Date.now()

    // Sleep function if needed to prevent shopify rate limit throttling
    const remaining = ending - starting > 500
        ? 0
        : 500 - (ending - starting)
        
    await sleep(remaining)

    variants.shift()
    return await exports.recursiveUpdate(ctx, shop, shopifyApi, marketplacePlugin, pluginProductParams, variants, responseArr)
}

exports.synchronizeProduct = async (ctx, shop, accessToken, productId, variants) => {
    // Get plugin data from marketplace
    const marketplacePlugin  = await exports.getMarketplacePlugin(shop)

    // Get product params from plugin
    const pluginProductParams = shop && productId && marketplacePlugin.plugin
        ? await exports.getMarketplaceProductParams(marketplacePlugin, productId)
        : {}

    if (pluginProductParams.id_product && pluginProductParams.id_collection) {
        const shopifyApi = new ShopifyApi({
            shopName : shop || ctx.params.shop,
            accessToken : accessToken,
            autoLimit : true
        })

        const responseArr = await exports.recursiveUpdate(ctx, shop, shopifyApi, marketplacePlugin, pluginProductParams, variants)

        return {
            productId : productId,
            responseArr : responseArr
        }
    }
    else {
        console.log(`Utils/Products <products/update> : warning <No marketplace plugin products>`)

        return {
            productId : productId,
            status : 'attention',
            message : 'no_plugin_products'
        }
    }
}

exports.getInventoryItemStock = async (ctx, paramShopifyApi, inventoryItemId) => {
    let stock = null
    let error = false

    // Get location
    const selectedLocation = await getSelectedLocation(ctx)
        
    const { selectedLocationId } = selectedLocation
    error = selectedLocation.error

    if (!error) {
        const accessToken = WITH_AUTHENTICATION == 'TRUE'
            ? ctx.req.headers['x-shopify-access-token']
            : await getStoreToken(`offline_${ctx.params.shop}.myshopify.com`)

        const shopifyApi = paramShopifyApi || new ShopifyApi({
            shopName : ctx.params.shop,
            accessToken : accessToken,
            autoLimit : true
        })

        // If still no error get inventory level
        if (!error) {
            let inventoryLevels = []

            let params = { 
                inventory_item_ids : ctx.params.inventoryItemId || inventoryItemId,
                location_ids : selectedLocationId,
                limit: 50
            }

            await shopifyApi.inventoryLevel
                .list(params)
                .then((reqInventoryLevels) => {
                    inventoryLevels = reqInventoryLevels
                })
                .catch((err) => {
                    error = err
                    console.log(`Api <GET> </:shop/products/:inventoryItemId/stock> <getInventoryLevels> : error <${err}>`)
                })

            if (!error) {
                stock = inventoryLevels[0] && inventoryLevels[0].available
                    ? inventoryLevels[0].available
                    : 0
            }
        }
    }

    return {
        stock : stock,
        error : error
    }
}