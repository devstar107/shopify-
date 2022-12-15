const { WITH_AUTHENTICATION } = process.env
const ShopifyApi = require('shopify-api-node')

const { getStore, getStoreToken, setStoreModel } = require('./redis')


exports.getSelectedLocation = async (ctx) => {
    const store = await getStore(`offline_${ctx.params.shop}.myshopify.com`)

    let selectedLocationId = store.selectedLocationId || null
	console.log("TCL: exports.getSelectedLocation -> selectedLocationId", selectedLocationId)
    let error = false

    if(!selectedLocationId) {
        const accessToken = WITH_AUTHENTICATION == 'TRUE'
            ? ctx.req.headers['x-shopify-access-token']
            : await getStoreToken(`offline_${ctx.params.shop}.myshopify.com`)

        const shopifyApi = new ShopifyApi({
            shopName : ctx.params.shop,
            accessToken : accessToken,
            autoLimit : true
        })

        // If no selected location we fetch default locatino id so that we donot have to fetch it for further requests
        await shopifyApi.location
            .list({ limit : 250 })
            .then(async (locations) => {
                const firstActiveLocationIndex = locations.findIndex((location) => location.active === true)
                selectedLocationId = locations[firstActiveLocationIndex].id
                // We then put the request in our redis so that we don't call this route over and over again
                await setStoreModel(`offline_${ctx.params.shop}.myshopify.com`, JSON.stringify({
                    ...store,
                    selectedLocationId : selectedLocationId
                }))
            })
            .catch((err) => {
                console.log(`Api <GET> </:shop/products/:inventoryItemId/stock> <getDefaultLocation> : error <${err}>`)
                error = err
            })
    }

    return { 
        selectedLocationId : selectedLocationId,
        error : error
    }
}