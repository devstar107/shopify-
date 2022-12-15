const { APP_API_VERSION } = process.env

const { isStoreInRedis, getStore, setStoreModel } = require('../../utils/redis')


module.exports = (router, storeExists, withAuthentication) => {
    //----------------------------------------------------------------
    //----- Marketplace token
    //----------------------------------------------------------------

    // Get Marketplace to Shopify token
    router.get(`/api/${APP_API_VERSION}/:shop/redis/marketplace-token`, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const store = await getStore(`offline_${ctx.params.shop}.myshopify.com`)

            const marketPlaceToken = store.marketPlaceToken || null

            ctx.status = 200
            ctx.body = { token : marketPlaceToken }
            return true
        }
    })

    // Put Marketplace to Shopify token
    router.put(`/api/${APP_API_VERSION}/:shop/redis/marketplace-token`, async (ctx) => {
        if (await storeExists(ctx) && await withAuthentication(ctx)) {
            const store = await getStore(`offline_${ctx.params.shop}.myshopify.com`)
            const marketPlaceToken = ctx.request.body.marketPlaceToken || null

            if (store && marketPlaceToken) {
                await setStoreModel(`offline_${ctx.params.shop}.myshopify.com`, JSON.stringify({
                    ...store,
                    marketPlaceToken : marketPlaceToken
                }))

                ctx.status = 204
                ctx.response.body = { success : 204 }
                return true 
            }
            else {
                console.log(`Api <PUT> </redis/marketplace-token> : error <${err}>`)

                ctx.status = 422
                ctx.response.body = { error : 'Unable to update marketplace token' }
                return false 
            }
        }
    })


    //----------------------------------------------------------------
    //----- Migration
    //----------------------------------------------------------------

    // Post data
    router.post(`/api/${APP_API_VERSION}/redis/migrate`, async (ctx) => {
        
        const text = {
    "poppyfieldthelabel": {
        "id": "offline_www.poppyfieldthelabel.com",
        "shop": "www.poppyfieldthelabel.com",
        "state": "141323934539181",
        "isOnline": false
    },
    "perksmyshopify": {
        "id": "offline_christmas-perks.myshopify.com",
        "shop": "christmas-perks.myshopify.com",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "state": "650649375564905",
        "selectedLocationId": 60362358971
    },
    "offlinewwwpoppyfieldthelabelcom": {
        "id": "offline_/www.poppyfieldthelabel.com",
        "shop": "/www.poppyfieldthelabel.com",
        "state": "821763543846315",
        "isOnline": false
    },
    "offlinenaturalcuddlesmyshopifycom": {
        "id": "offline_naturalcuddles.myshopify.com",
        "shop": "naturalcuddles.myshopify.com",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "state": "233338303151208",
        "selectedLocationId": 32901857325
    },
    "offlinelittle-prince-londonmyshopifycom": {
        "id": "offline_little-prince-london.myshopify.com",
        "shop": "little-prince-london.myshopify.com",
        "state": "110661323022735",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "selectedLocationId": 36802953295,
        "marketPlaceToken": "aunv3CZ4FvVgT9krsdwFiU3i0OZApZ887I47GDWPMFEpZH7ui9hk4XbS8wJl"
    },
    "offline_shortwholesalemyshopifycom": {
        "id": "offline_shortwholesale.myshopify.com",
        "shop": "shortwholesale.myshopify.com",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory"
    },
    "offline_dottydungareeswholesalecomcollectionsaw21": {
        "id": "offline_dottydungareeswholesale.com/collections/aw21",
        "shop": "dottydungareeswholesale.com/collections/aw21",
        "state": "600343060129457",
        "isOnline": false
    },
    "offline_bebenca-organicsmyshopifycom": {
        "id": "offline_bebenca-organics.myshopify.com",
        "shop": "bebenca-organics.myshopify.com",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "marketPlaceToken": "IF3Lktf1hdfWC3KqasEUBqaMmoe6pOXcW9bpDIm2LeGjcZwzcSgYOdX4jBth",
        "state": "620204444467212",
        "selectedLocationId": 32888160331
    },
    "offline_nobiggimyshopifycom": {
        "id": "offline_nobiggi.myshopify.com",
        "shop": "nobiggi.myshopify.com",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "marketPlaceToken": "GgoKSfZvJhoAmRfTza0T9osMPYiQ5aqbsOIRepix9T07SPkWc9AYQCWeUhzj"
    },
    "offline_wwwpoppyfieldthelabelcomfr": {
        "id": "offline_www.poppyfieldthelabel.com/fr",
        "shop": "www.poppyfieldthelabel.com/fr",
        "state": "459640169425439",
        "isOnline": false
    },
    "offline_ab-picaflor-editionsmyshopifycom": {
        "id": "offline_ab-picaflor-editions.myshopify.com",
        "shop": "ab-picaflor-editions.myshopify.com",
        "state": "889233867816212",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "selectedLocationId": "60904276058",
        "marketPlaceToken": "j"
    },
    "offline_aoCVFY-xDyPwYQA-mRwqUCCTuyLTqjCOWjjj": {
        "id": "offline_aoCVFY-xDyPwYQA-mRwqUCCT.uyLTqjCOW.jjj",
        "shop": "aoCVFY-xDyPwYQA-mRwqUCCT.uyLTqjCOW.jjj",
        "state": "800088315769029",
        "isOnline": false
    },
    "offline_piccoli-principi-swimwearmyshopifycomadmin": {
        "id": "offline_piccoli-principi-swimwear.myshopify.com/admin",
        "shop": "piccoli-principi-swimwear.myshopify.com/admin",
        "state": "645446820835675",
        "isOnline": false
    },
    "offline_wwwlmnthreecom": {
        "id": "offline_www.lmnthree.com",
        "shop": "www.lmnthree.com",
        "state": "069963882371152",
        "isOnline": false
    },
    "offline_beautypromyshopifycomadmin": {
        "id": "offline_beautypro.myshopify.com/admin",
        "shop": "beautypro.myshopify.com/admin",
        "state": "955494579443408",
        "isOnline": false
    },
    "offline_wwwdottydungareeswholesalecom": {
        "id": "offline_www.dottydungareeswholesale.com",
        "shop": "www.dottydungareeswholesale.com",
        "state": "084046612683386",
        "isOnline": false
    },
    "offline_yumibabymyshopifycom": {
        "id": "offline_yumibaby.myshopify.com",
        "shop": "yumibaby.myshopify.com",
        "state": "783941804515674",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "selectedLocationId": 40264728635,
        "marketPlaceToken": "VXbPfbJp5RXPzHd7bXnzeuQPKJcYZZ9kl4Cd13JEcOgG5ZxUFzrblmVaQB0L"
    },
    "offline_poppyfieldmyshopifycom": {
        "id": "offline_poppyfield.myshopify.com",
        "shop": "poppyfield.myshopify.com",
        "state": "252393272761815",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "selectedLocationId": 2806874142,
        "marketPlaceToken": "5Lypxjdo7xCG2lD8psKHhTxgINvB9MbmmbCIz4j5ughpVsmnWwZ3U73K0k8T"
    },
    "offline_dottydungarees-wholesalemyshopifycom": {
        "id": "offline_dottydungarees-wholesale.myshopify.com",
        "shop": "dottydungarees-wholesale.myshopify.com",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "marketPlaceToken": "RynsahZJdmFrnJuSjBoBHS8exLsqmMqqhSqy4iDno7eaWsxdaJU6MAVAadXN",
        "selectedLocationId": 20489175119,
        "state": "275017908383796"
    },
    "offline_beautypromyshopifycom": {
        "id": "offline_beautypro.myshopify.com",
        "shop": "beautypro.myshopify.com",
        "state": "195651724996834",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "selectedLocationId": 33169153,
        "marketPlaceToken": "t0Xbwb5TIV7NvUtPNCLDfBGbK7a0r2Rf4WiEJblWNELEJK5oUJKGwxFeX7pO"
    },
    "offline_bonnie-the-gangmyshopifycom": {
        "id": "offline_bonnie-the-gang.myshopify.com",
        "shop": "bonnie-the-gang.myshopify.com",
        "state": "123192518653515",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "selectedLocationId": "16962945079",
        "marketPlaceToken": "q5LpkHn6fp0cVqJmlvSffcZDcaaVnsvaFZpKcoWascGQcSAXe54fytURsT7H"
    },
    "offline_chipotepasmyshopifycom": {
        "id": "offline_chipotepas.myshopify.com",
        "shop": "chipotepas.myshopify.com",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "marketPlaceToken": "jKVqcNfSmHHgkgLqL6PbecfjKI8G2ELIRlR6ERxabzTrOeKzkVUgNSIDChNl",
        "selectedLocationId": 38116742
    },
    "offline_wwwbeautyprocom": {
        "id": "offline_www.beautypro.com",
        "shop": "www.beautypro.com",
        "state": "527598553746850",
        "isOnline": false
    },
    "offline_headsterkidsmyshopifycom": {
        "id": "offline_headsterkids.myshopify.com",
        "shop": "headsterkids.myshopify.com",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "marketPlaceToken": "ksGl4IMOyI8jncoRC4fkt9AfppyLqnjS8QrinRSl8zCBc24kF9fiYpAREUjN",
        "selectedLocationId": 26719566,
        "state": "104793449577746"
    },
    "offline_kidiwi-handmade-clothingmyshopifycom": {
        "id": "offline_kidiwi-handmade-clothing.myshopify.com",
        "shop": "kidiwi-handmade-clothing.myshopify.com",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "marketPlaceToken": "tPhDWFywlg1w5dqYnWdvlvxpASfqafwaVdqzK1ej9G6W3E9hJom6h02Uad0h",
        "state": "825380874346949",
        "selectedLocationId": 36334076043
    },
    "offline_faire-child-makewearmyshopifycom": {
        "id": "offline_faire-child-makewear.myshopify.com",
        "shop": "faire-child-makewear.myshopify.com",
        "state": "107651655093281",
        "isOnline": false,
        "accessToken": "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",
        "scope": "write_products,write_orders,write_draft_orders,write_inventory",
        "selectedLocationId": 33298579508,
        "marketPlaceToken": "plkWXJmylAxIMbDrfMcJ2EVhw4FBTn3bqkvj9frjHMuiZYuYMP7BWV9ypzuY"
    }
}
        const stores = JSON.parse(JSON.stringify(text))
        
        if(stores)
            await (async (stores) => {
                for (const [keyt, store] of Object.entries(stores)) {
                    console.log(store)
                    if(await isStoreInRedis(store.id)) {
                        const existingStore = await getStore(store.id)

                        for (const [key, value] of Object.entries(existingStore)) {
                            store[key] = value
                        }
                    }

                    await setStoreModel(store.id, JSON.stringify(store))
                }
            })(stores)

        ctx.status = 204
        ctx.response.body = { success : 204 }
        return true 
    })


    // Get specific key
    router.get(`/api/${APP_API_VERSION}/redis/keys/:keyId`, async (ctx) => {
        const { keyId } = ctx.params

        if(await isStoreInRedis(keyId)) {
            const existingStore = await getStore(keyId)

            ctx.status = 200
            ctx.response.body = { keyId : existingStore }
            return true 
        }
        else {
            ctx.status = 404
            ctx.response.body = { error : 'No key with this id found.' }
            return false 
        }
    })
}
