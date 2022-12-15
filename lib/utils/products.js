const axios = require('axios')


module.exports.getMarketplaceToken = async (shopifyAppUrl, appApiVersion, parsedShopOrigin, shopifyAccessToken) => {
    let marketplaceToken = null

    await axios.get(`${shopifyAppUrl}/api/${appApiVersion}/${parsedShopOrigin}/redis/marketplace-token`, {
        headers: {
            'Accept' : 'application/json',
            'Content-Type' : 'application/x-www-form-urlencoded',
            'X-Shopify-Access-Token' : shopifyAccessToken
        }
    }).then((response) => {
        marketplaceToken = response.data.token
    }).catch((err) => {})
    
    return marketplaceToken
}

module.exports.parseStock = async (product, stockFromSelectedLocation = false) => {
    let stock = 0

    const stockToFetch = stockFromSelectedLocation
        ? 'selected_location_inventory_quantity'
        : 'inventory_quantity'

    product.variants.forEach((variant) => {
        if (variant[stockToFetch])
            stock += variant[stockToFetch]
    })

    return stock
}

module.exports.parseSyncStatuses = (arr) => {
    // Sort array by status ASC so that first elements that we will push are the success statuses
    arr.sort((a, b) => (a.status < b.status) ? -1 : (a.status > b.status) ? 1 : 0)

    // Parse array to get rid off of the extra 422 responses when testing possible variants
    let parsedResponseArr = []
    arr.forEach((item) => {
        if(!parsedResponseArr.find((parsedItem) => parsedItem && parsedItem.variant == item.variant))
            parsedResponseArr.push(item)
    })
    
    return parsedResponseArr
}