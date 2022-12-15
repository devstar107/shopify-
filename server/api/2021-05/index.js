const { storeExists, withAuthentication } = require('../../utils/api') 

module.exports = (router, customRateLimit) => {
    require('./locations.js')(router, customRateLimit, storeExists, withAuthentication)
    require('./products.js')(router, customRateLimit, storeExists, withAuthentication)
    require('./redis.js')(router, storeExists, withAuthentication)
}