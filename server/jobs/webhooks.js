const Queue = require('bull')
const webhookQueue = new Queue('webhook queue', process.env.REDIS_URL)

const { synchronizeProduct } = require('../utils/products')
const { getStoreToken } = require('../utils/redis')
const { storeExists } = require('../utils/api') 


module.exports = () => {
    webhookQueue.process(async (job, done) => {
        try {
            console.log('Job <webhookQueue> : status <processing>')

            let ctx = job.data.ctx
            ctx.params = ctx.params || {}
            ctx.params.shop = job.data.shop

            const webhook = job.data.webhook

            if (await storeExists(ctx)) {
                if (
                    webhook
                    && webhook.payload
                    && webhook.payload.id
                ) {
                    const productId = webhook.payload.id
                    const variants = webhook.payload.variants
                    const shop = webhook.domain.replace('.myshopify.com', '')
                    ctx.params = ctx.params || {}
                    ctx.params.shop = shop
            
                    // 💩 in terms of security
                    const accessToken = await getStoreToken(`offline_${shop}.myshopify.com`)
            
                    if(accessToken)
                        await synchronizeProduct(ctx, shop, accessToken, productId, variants)

                    console.log('Job <webhookQueue> : status <successfully processed>')
                    done()
                    return true
                }
            
                console.log(`Job <webhookQueue> : error <No product id received>`)
                return false 
            }
            
            console.log(`Job <webhookQueue> : error <Store does not exist>`)
            return false   
        }
        catch {
            console.log('Job <webhookQueue> : status <error>')
            throw new Error('Unexpected error')
        }
    })
}
