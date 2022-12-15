const { APP_API_VERSION, WITH_AUTHENTICATION } = process.env
const ShopifyApi = require('shopify-api-node')

const { getStore, getStoreToken, setStoreModel } = require('../../utils/redis')
const { getSelectedLocation } = require('../../utils/locations')


module.exports = (router, customRateLimit, storeExists, withAuthentication) => {
    // Get list of shopify locations
    router.get(`/api/${APP_API_VERSION}/:shop/locations`, customRateLimit, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const accessToken = WITH_AUTHENTICATION == 'TRUE'
                ? ctx.req.headers['x-shopify-access-token']
                : await getStoreToken(`offline_${ctx.params.shop}.myshopify.com`)

            const shopifyApi = new ShopifyApi({
                shopName : ctx.params.shop,
                accessToken : accessToken,
                autoLimit : true
            })

            let locations = []
            let error = false

            await (async () => {
                let params = { limit: 250 }

                do {
                    const reqLocations = await shopifyApi.location.list(params)
                    if (reqLocations && reqLocations.length)
                        locations.push(...reqLocations)

                    params = reqLocations.nextPageParameters
                } while (params !== undefined)
            })().catch((err) => {
                error = err
                console.log(`Api <GET> </locations> : error <${err}>`)
            })

            if (!error) {
                ctx.status = 200
                ctx.body = { locations : locations }
                return true 
            }
            else {
                ctx.status = 500
                ctx.body = { error : error }
                return false 
            }
        }
    })

    // Get selected location
    router.get(`/api/${APP_API_VERSION}/:shop/selected-location`, customRateLimit, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const { selectedLocationId, error } = await getSelectedLocation(ctx)

            if(!error) {
                ctx.status = 200
                ctx.body = { selectedLocationId : selectedLocationId }
                return true 
            }
            else {
                console.log(`Api <GET> </selected-location> : error <${err}>`)

                ctx.status = 422
                ctx.response.body = { error : 'Unable to get selected location' }
                return false 
            }

        }
    })

    // Put selected location
    router.put(`/api/${APP_API_VERSION}/:shop/selected-location`, customRateLimit, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const store = await getStore(`offline_${ctx.params.shop}.myshopify.com`)
            const selectedLocationId = ctx.request.body.selectedLocationId || null

            if (store && selectedLocationId) {
                await setStoreModel(`offline_${ctx.params.shop}.myshopify.com`, JSON.stringify({
                    ...store,
                    selectedLocationId : selectedLocationId
                }))

                ctx.status = 204
                ctx.response.body = { success : 204 }
                return true 
            }
            else {
                console.log(`Api <PUT> </selected-location> : error <${err}>`)

                ctx.status = 422
                ctx.response.body = { error : 'Unable to update selected location' }
                return false 
            }
        }
    })
}