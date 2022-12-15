require('isomorphic-fetch')
const Koa = require('koa')
const next = require('next')

const dotenv = require('dotenv-flow')
dotenv.config()

const { default: shopifyAuth } = require('@shopify/koa-shopify-auth')
const { verifyRequest } = require('@shopify/koa-shopify-auth')
const { default: Shopify, ApiVersion } = require('@shopify/shopify-api')

const Router = require('koa-router')
const bodyParser = require('koa-bodyparser')

const ratelimit = require('koa-ratelimit')
const Redis = require('ioredis')

const RedisStore = require('./redis/store')
const sessionStorage = new RedisStore()

Shopify.Context.initialize({
    API_KEY: process.env.SHOPIFY_API_KEY,
    API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SHOPIFY_API_SCOPES.split(','),
    HOST_NAME: process.env.SHOPIFY_APP_URL.replace(/https:\/\//, ''),
    API_VERSION: ApiVersion.October20,
    IS_EMBEDDED_APP: true,
    SESSION_STORAGE: new Shopify.Session.CustomSessionStorage(
        sessionStorage.storeCallback,
        sessionStorage.loadCallback,
        sessionStorage.deleteCallback
    )
})

const ACTIVE_SHOPIFY_SHOPS = {}

const port = parseInt(process.env.PORT, 10) || 3000
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const { webhooksRegistration } = require('./webhooks/registration')


app.prepare().then(async () => {
    const server = new Koa()
    const router = new Router()

    // Custom rate limit
    const customRateLimit = ratelimit({
        driver: 'redis',
        db: new Redis(process.env.REDIS_URL),
        duration: 1 * 1000,
        errorMessage: 'Server <ratelimit> : error 429 <Too many requests>',
        id: (ctx) => ctx.ip,
        headers: {
            remaining: 'X-Rate-Limit-Remaining',
            reset: 'X-Rate-Limit-Reset',
            total: 'X-Rate-Limit-Total'
        },
        max: 2,
        disableHeader: false,
        whitelist: (ctx) => {},
        blacklist: (ctx) => {}
    })

    server.use(bodyParser())

    server.keys = [Shopify.Context.API_SECRET_KEY]
    server.use(
        shopifyAuth({
            accessMode : 'offline',

            async afterAuth(ctx) {
                // Access token and shop available in ctx.state.shopify
                const { shop, accessToken } = ctx.state.shopify

                ACTIVE_SHOPIFY_SHOPS[shop] = true

                // Register webhooks
                webhooksRegistration(Shopify, shop, accessToken)

                // Redirect to app with shop parameter upon auth
                ctx.redirect(`/?shop=${shop}`)
            },
        })
    )

    // Jobs
    require('./jobs/webhooks')()

    // Api routes
    require('./api/2021-05')(router, customRateLimit)

    // Webhooks routes
    require('./webhooks/routes')(Shopify, router, customRateLimit, ACTIVE_SHOPIFY_SHOPS)

    const isShopAllowed = async (ctx, withSession = false) => {
        const shop = ctx.query.shop

        // If this shop hasn't been seen yet, go through OAuth to create a session
        if (ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
            if (shop !== undefined)
                ctx.redirect(`/auth?shop=${shop}`)
        }else{
            await handleRequest(ctx, withSession)
        }
    }

    const handleRequest = async (ctx, withSession = false) => {
        const shop = ctx.query.shop
        if(withSession) {
            if (shop){
                const session = await Shopify.Context.SESSION_STORAGE.loadCallback(`offline_${shop}`)
                if(session)
                    ctx.req.headers.shopifyAccessToken = session.accessToken
            }
        }

        // Header for https://shopify.dev/apps/store/security/iframe-protection
        const headerSecurityValue = (Shopify.Context.IS_EMBEDDED_APP && shop)
            ? `frame-ancestors https://${shop} https://admin.shopify.com;`
            : `frame-ancestors 'none';`;

        ctx.set('Content-Security-Policy', headerSecurityValue);


        await handle(ctx.req, ctx.res)
        ctx.respond = false
        ctx.res.statusCode = 200
    }

    // Allowed pages routes
    router.get('/', (ctx) => isShopAllowed(ctx, true))
    router.get('/faq',(ctx) =>  isShopAllowed(ctx, true))
    router.get('/products', (ctx) => isShopAllowed(ctx, true))
    router.get('(/products/.*)', (ctx) => isShopAllowed(ctx, true))

    router.get('(/images/.*)', handleRequest)           // Image content is clear
    router.get('(/documentation/.*)', handleRequest)    // Documentation content is clear

    router.get('(/_next/static/.*)', handleRequest)     // Static content is clear
    router.get('/_next/webpack-hmr', handleRequest)     // Webpack content is clear
    router.get('(.*)', verifyRequest(), handleRequest)  // Everything else must have sessions

    server.use(router.allowedMethods())
    server.use(router.routes())
    server.listen(port, () => {
        console.log(`> App listening on <port> : ${port}`)
    })
})
