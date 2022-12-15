const { default: Shopify } = require('@shopify/shopify-api')


const Queue = require('bull')
const webhookQueue = new Queue('webhook queue', process.env.REDIS_URL)


module.exports = (router, webhook) => {

    /**
     * Customers can request their data from a store owner. When this happens,
     * Shopify invokes this webhook.
     *
     * https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks#customers-data_request
     */
    router.post('/customers/data_request', webhook, async (ctx) => {
        return {
            'shop' : 'empty'
        }

    })

    /**
     * Store owners can request that data is deleted on behalf of a customer. When
     * this happens, Shopify invokes this webhook.
     *
     * https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks#customers-redact
     */
    router.post('/customers/redact', webhook, async (ctx) => {
        return {
            'shop' : 'empty'
        }
    })

    /**
     * 48 hours after a store owner uninstalls your app, Shopify invokes this
     * webhook.
     *
     * https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks#shop-redact
     */
    router.post('/shop/redact', webhook, async (ctx) => {
        return {
            'shop' : 'empty'
        }
    })
}
