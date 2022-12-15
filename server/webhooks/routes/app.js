const { isStoreInRedis, removeStoreModel } = require('../../utils/redis')

module.exports = (router, webhook, storeExists, ACTIVE_SHOPIFY_SHOPS) => {
    router.post('/webhooks/app/uninstall', webhook, async (ctx) => {
        if (await storeExists(ctx)) {
            if (
                ctx.state.webhook
                && ctx.state.webhook.domain
            ) {
                const shop = ctx.state.webhook.domain

                if (await isStoreInRedis(`offline_${shop}`)) {
                    console.log(`Webhooks <app/uninstall> : success`)

                    await removeStoreModel(`offline_${shop}`)
                    delete ACTIVE_SHOPIFY_SHOPS[shop]

                    ctx.status = 204
                    ctx.response.body = { success : 204 }
                    return true 
                }
                else
                    console.log(`Webhooks <app/uninstall> : warning <No associated shopify domain in redis>`)
            }

            console.log(`Webhooks <app/uninstall> : error <No shopify domain received>`)

            ctx.status = 422
            ctx.response.body = { error : 'Unable to process <app/uninstall> webhook' }
            return false 
        }
    })
}