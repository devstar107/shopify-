const { isStoreInRedis, getStoreToken } = require('./redis')

exports.storeExists = async (ctx) => {
    const shop = ctx.params.shop

    const storeExists = shop && await isStoreInRedis(`offline_${shop}.myshopify.com`)

    if (storeExists)
        return true
    else {
        console.log(`Api <storeExists> : status <422> message <Store does not exist>`)

        ctx.status = 422
        ctx.body = { error : 'Store does not exist' }
        return false 
    }
}

exports.withAuthentication = async (ctx) => {
    const isAuthenticationRequired = process.env.WITH_AUTHENTICATION
    
    // console.log(`Api <withAuthentication> : isRequired <${isAuthenticationRequired}>`)

    if (isAuthenticationRequired === 'TRUE') {
        const shop = ctx.state && ctx.state.webhook && ctx.state.webhook.domain
            ? ctx.state.webhook.domain.replace('.myshopify.com', '')
            : ctx.params.shop

        const reqHeadersToken = ctx.req.headers['x-shopify-access-token']
        const storedToken = await getStoreToken(`offline_${shop}.myshopify.com`)

        console.log(`Api <withAuthentication> : reqHeadersToken <${reqHeadersToken}>`)
        console.log(`Api <withAuthentication> : storedToken <${storedToken}>`)
        console.log(`Api <withAuthentication> : isAllowed <${reqHeadersToken == storedToken}>`)

        if (reqHeadersToken == storedToken)
            return true
        else {
            console.log(`Api <withAuthentication> : status <401>`)

            ctx.status = 401
            ctx.body = { error : 401 }
            return false 
        }
    }
    else {
        return true
    }
}