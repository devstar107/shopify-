const Queue = require('bull')
const webhookQueue = new Queue('webhook queue', process.env.REDIS_URL)


module.exports = (router, webhook) => {
    // Synchronize product stock on product update
    router.post('/webhooks/products/update', webhook, async (ctx) => {
        if(ctx.state && ctx.state.webhook) {
            console.log(`Webhooks <products/update> : Webhook successfully added to job queue`)

            const shop = ctx.state.webhook.domain.replace('.myshopify.com', '')

            webhookQueue.add({ 
                ctx : ctx,
                shop : shop,
                webhook : JSON.parse(JSON.stringify(ctx.state.webhook))
            })

            ctx.status = 200
            ctx.response.body = { success : 200 }
            return true 
        }
        else {
            console.log(`Webhooks <products/update> : error <Unable to process <products/update> webhook>`)

            ctx.status = 422
            ctx.response.body = { error : 'Unable to process <products/update> webhook' }
            return false 
        }
    })
}