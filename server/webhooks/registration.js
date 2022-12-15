const { registerWebhook } = require('@shopify/koa-shopify-webhooks')


exports.webhooksRegistration = async (Shopify, shop, accessToken) => {
    // Prepare list of needed webhooks
    const webhookList = [
        {
            topic : 'APP_UNINSTALLED',
            address : '/app/uninstall'
        },
        {
            topic : 'PRODUCTS_UPDATE',
            address : '/products/update'
        }
    ]


    // Webhook registration function
    const registerMultipleWebhooks = async (webhook) => {
        const registration = await registerWebhook({
            shop,
            accessToken,
            address: `${process.env.SHOPIFY_APP_URL}/webhooks${webhook.address}`,
            topic: webhook.topic,
            apiVersion: Shopify.Context.API_VERSION
        })

        if (registration.success)
            console.log(`Webhook registration <${webhook.topic.replace('_', '/').toLowerCase()}> : success`)
        else
            console.log(`Webhook registration <${webhook.topic.replace('_', '/').toLowerCase()}> : failed <${JSON.stringify(registration.result.data)}>`)
    }


    // Async loop for webhook registration
    await (async (webhookList) => {
        const registrationsPromises = webhookList.map(async (webhook) => {
            await registerMultipleWebhooks(webhook)
        })

        await Promise.all(registrationsPromises)
    })(webhookList)
}