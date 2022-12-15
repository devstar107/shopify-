const { receiveWebhook } = require('@shopify/koa-shopify-webhooks')
const { SHOPIFY_API_SECRET } = process.env

const { storeExists } = require('../../utils/api')

module.exports = (Shopify, router, ACTIVE_SHOPIFY_SHOPS) => {
    const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET })

    require('./app.js')(router, webhook, storeExists, ACTIVE_SHOPIFY_SHOPS)
    require('./products.js')(router, webhook, storeExists)
    require('./gdpr.js')(router, webhook, storeExists)
}
