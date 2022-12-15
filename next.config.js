const dotenv = require('dotenv-flow')
dotenv.config()

const webpack = require('webpack')
const { i18n } = require('./next-i18next.config')

const apiKey = JSON.stringify(process.env.SHOPIFY_API_KEY)

module.exports = {
    i18n,
    webpack: (config) => {
        const env = {
            API_KEY: apiKey
        }

        config.module.rules.push({
            type: 'javascript/auto',
            test: /\.mjs$/,
            use: []
        })

        config.plugins.push(new webpack.DefinePlugin(env))

        return config
    }
}
