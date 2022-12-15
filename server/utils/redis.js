// Create a new Redis Client (with heroku env if exists or null in local)
let client = require('redis').createClient(process.env.REDIS_URL)

// In order to work with promises
const { promisify } = require('util')

// Re-creating redis functions so that they work asynchronously
const existsAsync = promisify(client.exists).bind(client)
const getAsync = promisify(client.get).bind(client)


// Check if the store url is known in our redis data store
exports.isStoreInRedis = async (shop) => {
    const bool = await existsAsync(shop).then(res => {
        // console.log(`Redis <storeToken/exist> : shop <${shop}> exists <${res == 1 ? 'true' : 'false'}>`)

        return res == 1 ? true : false
    })

    return bool
}


// Create a key/value pair with store url and access token (used to create or update a key/value pair)
exports.setStoreModel = async (shop, data) => {
    console.log(`Redis <storeToken/create|update> : shop <${shop}> data <${data}>`)

    client.set(shop, data)
}

// Remove a store from our redis data store
exports.removeStoreModel = async (shop) => {
    client.del(shop, (err, reply) => {
        console.log(`Redis <storeToken/delete> : ${reply}`)
    })
}


// Get store token
exports.getStore = async (shop) => {
    const store = await getAsync(shop).then(res => JSON.parse(res))

    return store
}

// Get store token
exports.getStoreToken = async (shop) => {
    const token = await getAsync(shop).then(res => {
        const store = JSON.parse(res)

        return store.accessToken
    })

    return token
}

// Get store token from app 1.0
exports.getOldStoreToken = async (shop) => {
    const token = await getAsync(shop).then(res => {
        return res
    })

    return token
}

// Get marketplace token from app 1.0
exports.getOldMarketplaceToken = async (shop) => {
    shop = shop.indexOf('.myshopify.com') != -1 ? shop : shop += ".myshopify.com"
    const token = await getAsync(`shopify_to_picaflor_${shop}`).then(res => {
        return res
    })

    return token
}