import React from 'react'
import App from 'next/app'
import Head from 'next/head'

import { AppProvider } from '@shopify/polaris'
import { Provider, Context } from '@shopify/app-bridge-react'
import { authenticatedFetch } from '@shopify/app-bridge-utils'
import '@shopify/polaris/dist/styles.css'

import ApolloClient from 'apollo-boost'
import { ApolloProvider } from 'react-apollo'

import { appWithTranslation } from 'next-i18next'
import translations from '@shopify/polaris/locales/en.json'

import { RoutePropagator } from '../components/RoutePropagator'


class MyProvider extends React.Component {
    static contextType = Context

    render () {
        const app = this.context

        const client = new ApolloClient({
            fetch : authenticatedFetch(app),
            fetchOptions : {
                credentials : 'include'
            },
        })


        const { children } = this.props

        return (
            <ApolloProvider client={client}>
                {children}
            </ApolloProvider>
        )
    }
}

class MyApp extends App {
    render() {
        const { Component, pageProps,forceRedirect, shopOrigin, shopifyAccessToken } = this.props

        const config = {
            apiKey: API_KEY,
            shopOrigin,
            forceRedirect
        }

        return (
            <React.Fragment>
                <Head>
                    <title>EventsUnited | Stocks sync</title>
                    <meta charSet="utf-8" />
                </Head>

                <Provider config={config}>
                    <AppProvider i18n={translations}>
                        <RoutePropagator />

                        <MyProvider>
                            <Component
                                {...pageProps}
                                shopOrigin={shopOrigin}
                                shopifyAccessToken={shopifyAccessToken}
                            />
                        </MyProvider>
                    </AppProvider>
                </Provider>
            </React.Fragment>
        )
    }
}

MyApp.getInitialProps = async ({ ctx }) => {
    const { shopifyAccessToken } = ctx.req.headers

    return {
        shopOrigin: ctx.query.shop,
        shopifyAccessToken,
        location : ctx.req.url,
        forceRedirect: JSON.parse(process.env.SHOPIFY_APP_FORCE_REDIRECT ?? 'true')
    }
}

export default appWithTranslation(MyApp)
