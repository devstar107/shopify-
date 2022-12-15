import React, { useState, useEffect, useContext } from 'react'
import axios from 'axios'

import {
    Page,
    Layout,
    Card,
    Stack,
    Spinner,
    ResourceList,
    ResourceItem,
    TextStyle,
    Thumbnail,
    Icon,
    Badge,
    Heading,
    SkeletonThumbnail,
    SkeletonBodyText,
    SkeletonDisplayText,
    Banner
} from '@shopify/polaris'
import {
    ImageMajor
} from '@shopify/polaris-icons'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { DefaultLayout } from '@layouts'

import { getMarketplaceToken, parseStock, parseSyncStatuses } from '../../lib/utils/products'

import { Context as AppBridgeContext } from '@shopify/app-bridge-react'
import { Redirect } from '@shopify/app-bridge/actions'


const Product = (props) => {
    const appBridge = useContext(AppBridgeContext)
    const redirect = Redirect.create(appBridge)

    const { shopOrigin, shopifyAccessToken, shopifyAppUrl, appApiVersion, productId } = props
    const parsedShopOrigin = shopOrigin.replace('.myshopify.com', '')

    const t = {
        common : useTranslation('common').t,
        products : useTranslation('products').t
    }
    
    const [isSynchronizing, setIsSynchronizing] = useState(false)
    const [isSessionStorageLoaded, setIsSessionStorageLoaded] = useState(false)

    // Events United token
    const [marketplaceToken, setMarketplaceToken] = useState(undefined)

    // Product
    const [product, setProduct] = useState(undefined)

    // Banner
    const [showBanner, setShowBanner] = useState(true)

    
    const getProduct = async () => {
        let product = null

        await axios.get(`${shopifyAppUrl}/api/${appApiVersion}/${parsedShopOrigin}/products/${productId}?fields=stock`, {
            headers: {
                'Accept' : 'application/json',
                'Content-Type' : 'application/x-www-form-urlencoded',
                'X-Shopify-Access-Token' : shopifyAccessToken
            }
        }).then((response) => {
            product = response.data
        }).catch((err) => {})


        // Parse products stock
        product.parsedStock = await parseStock(product, false)
        product.selectedLocationParsedStock = await parseStock(product, true)
    
        return product
    }

    const parseVariantImage = (imageId) => {
        let source = null
        
        product.images.find((image) => {
            if(image.id == imageId)
                source = image.src
            return image.id == imageId
        })

        return source
    }

    const handleSynchronizationStatuses = (response) => {
        const immutableProduct = JSON.parse(JSON.stringify(product))

        immutableProduct.variants.forEach((variant, i) => {
            if(response && response.status)
                immutableProduct.variants[i].status = response.status
            else if(response && response.responseArr)
                response.responseArr.find((response) => {
                    if(response && response.variant == variant.title)
                        immutableProduct.variants[i].status = response.status
                    return response && response.variant == variant.title
                })
        })

        setProduct(immutableProduct)
    }

    const synchronize = async (productToSync) => {
        setIsSynchronizing(true)

        let productResponse = null

        // Update stocks
        let requestBody = {
            shop : shopOrigin,
            productId : productToSync.id,
            variants : JSON.stringify(productToSync.variants),
        }

        requestBody = Object.keys(requestBody).map((key) => {
            return encodeURIComponent(key) + '=' + encodeURIComponent(requestBody[key])
        }).join('&')

        await axios.put(`${shopifyAppUrl}/api/${appApiVersion}/${parsedShopOrigin}/products/update`, requestBody, {
            headers: {
                'Accept' : 'application/json',
                'Content-Type' : 'application/x-www-form-urlencoded',
                'X-Shopify-Access-Token' : shopifyAccessToken
            }
        }).then((response) => {
            productResponse = response.data
        }).catch((err) => {})

        if(productResponse) {
            if(productResponse.responseArr)
                productResponse.responseArr = parseSyncStatuses(productResponse.responseArr)

            handleSynchronizationStatuses(productResponse)
        }

        sessionStorage.setItem(productId, JSON.stringify(productResponse))

        setIsSynchronizing(false)
    }

    const viewOnStore = () => {
        redirect.dispatch(Redirect.Action.REMOTE, {
            url : `https://${shopOrigin}/products/${product.handle}`,
            newContext: true
        })
    }

    const editShopifyProduct = () => {
        redirect.dispatch(Redirect.Action.ADMIN_PATH, `/products/${productId}`)
    }


    useEffect(async () => {
        // Handle marketplace token on load
        setMarketplaceToken(await getMarketplaceToken(shopifyAppUrl, appApiVersion, parsedShopOrigin, shopifyAccessToken))

        // Get product
        setProduct(await getProduct())
    }, [])

    useEffect(async () => {
        // Get statuses from session storage
        if(product && !isSessionStorageLoaded && sessionStorage.getItem(productId)) {
            handleSynchronizationStatuses(JSON.parse(sessionStorage.getItem(productId)))
            setIsSessionStorageLoaded(true)
        }
    }, [product])


    return (
        <DefaultLayout shopOrigin={shopOrigin}>
            <Page
                title={product && product.title ? product.title : t.common('product.singular')}
                primaryAction={{
                    content : t.products('synchronize'),
                    loading : isSynchronizing,
                    onAction : () => synchronize(product)
                }}
                secondaryActions={[
                    {
                        content : t.common('view_on_your_store'),
                        onAction : () => viewOnStore()
                    },
                    {
                        content : t.common('edit_product'),
                        onAction : () => editShopifyProduct()

                    }
                ]}
                breadcrumbs={[
                    {
                        content:  t.common('product.plural'),
                        url: `/products?shop=${shopOrigin}`
                    }
                ]}
            >
                <Layout>
                    <Layout.Section>
                        {marketplaceToken === undefined || product === undefined && 
                            <>
                                <Card>
                                    <Card.Section>
                                        <Stack wrap={false}>
                                            <SkeletonThumbnail size="large" />
                                            <div style={{width: '300px'}}>
                                                <Stack vertical>
                                                    <SkeletonDisplayText size="small" />
                                                    <SkeletonBodyText lines={2} />
                                                </Stack>
                                            </div>
                                        </Stack>
                                    </Card.Section>
                                </Card>

                                <Card>
                                    <Card.Section>
                                        <Stack distribution="center">
                                            <Spinner size="large" />
                                        </Stack>
                                    </Card.Section>
                                </Card>
                            </>
                        }

                        {marketplaceToken && marketplaceToken.length && product !== undefined &&
                            <>
                                <Card>
                                    <Card.Section>
                                        <Stack wrap={false}>
                                            {product.images && product.images[0] 
                                                ? 
                                                    <Thumbnail
                                                        source={product.images[0].src}
                                                        size="large"
                                                    />
                                                : 
                                                    <div className="Polaris-ResourceItem__Media">
                                                        <Icon source={ImageMajor} />
                                                    </div>
                                            }
                                            
                                            <Stack vertical>
                                                <Heading>{product.title}</Heading>
                                                <div className="ParsedStock-Container">
                                                    <TextStyle>
                                                        {t.products('inStockForVariants')
                                                            .replace('{parsedStock}', product.parsedStock)
                                                            .replace('{variantsLength}', product.variants.length)
                                                        }
                                                    </TextStyle>
                                                    <TextStyle>
                                                        {t.products('inStockForSelectedLocation')
                                                            .replace('{selectedLocationParsedStock}', product.selectedLocationParsedStock)
                                                        }
                                                    </TextStyle>
                                                </div>
                                            </Stack>
                                        </Stack>
                                    </Card.Section>
                                </Card>

                                <Card>
                                    <ResourceList
                                        loading={isSynchronizing}
                                        resourceName={{
                                            singular: t.common('variant.singular'),
                                            plural: t.common('variant.plural')
                                        }}
                                        items={product.variants}
                                        renderItem={(item) => {
                                            const { id, image_id, title, status, inventory_quantity, selected_location_inventory_quantity } = item

                                            return (
                                                <ResourceItem id={id} >
                                                    <div className="Polaris-ResourceItem-Grid">
                                                        {/* Thumbnail */}
                                                        {product.images && product.images.length && image_id
                                                            ?
                                                                <Thumbnail source={parseVariantImage(image_id)} />
                                                            :
                                                                <div className="Polaris-ResourceItem__Media Polaris-ResourceItem__Media--small">
                                                                    <Icon source={ImageMajor} />
                                                                </div>
                                                        }

                                                            {/* Title */}
                                                            <TextStyle variation="strong">
                                                                {title}
                                                            </TextStyle>

                                                            {/* Stocks */}
                                                            <Stack vertical>
                                                                <TextStyle>
                                                                    {inventory_quantity} {t.products('inStock')}
                                                                </TextStyle>
                                                                <TextStyle>
                                                                    {t.products('inStockForSelectedLocation')
                                                                        .replace('{selectedLocationParsedStock}', selected_location_inventory_quantity)
                                                                    }
                                                                </TextStyle>
                                                            </Stack>

                                                            {/* Status */}
                                                            <Stack vertical>
                                                                {status &&
                                                                    <Badge status={status == 'warning' ? 'critical' : status}>
                                                                        {t.products(`status.${status == 'warning' ? 'not_synchronized' : status}`)}
                                                                    </Badge>
                                                                }
                                                            </Stack>

                                                            {/* Feedback */}
                                                            <div>
                                                                {status && status == 'attention' &&
                                                                    <TextStyle>
                                                                        {t.products('check_matching_product')}
                                                                    </TextStyle>
                                                                }
                                                                {status && status == 'warning' && title.split('/').length <= 1 &&
                                                                    <TextStyle>
                                                                        {t.products('check_missing_option')}
                                                                    </TextStyle>
                                                                }
                                                                {status && status == 'warning' &&
                                                                    <TextStyle>
                                                                        <div dangerouslySetInnerHTML={{__html: 
                                                                            t.products('check_integration_parameters')
                                                                                .replace('{option1}', title.split('/')[0])
                                                                                .replace('{option2}', title.split('/')[1])
                                                                        }}></div>
                                                                    </TextStyle>
                                                                }
                                                            </div>
                                                    </div>
                                                </ResourceItem>
                                            )
                                        }}
                                    />
                                </Card>
                            </>
                        }
                    </Layout.Section>
                </Layout>
            </Page>

            <style jsx global>{`
                .Polaris-ResourceItem-Grid {
                    display: grid;
                    grid-template-columns: 5.2rem .25fr .3fr 200px .45fr;
                    align-items: center;
                    grid-gap: .8rem 1.6rem;
                }

                .Polaris-ResourceItem-Grid .Polaris-Stack {
                    margin: auto 0;
                    padding-bottom: .3rem;
                }

                .Polaris-ResourceItem-Grid .Polaris-Stack--vertical > .Polaris-Stack__Item {
                    margin-top: .1rem;
                }

                .Polaris-ResourceItem__Container {
                    align-items: center;
                    pointer-events : none;
                }

                .Polaris-ResourceItem__Media,
                .Polaris-Thumbnail {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border-radius: var(--p-border-radius-base,3px);
                    border: .1rem solid var(--p-border-subdued);
                    background: var(--p-surface,#f9fafb);
                    width: 8rem;
                    height: 8rem;
                }

                .Polaris-ResourceItem__Media .Polaris-Icon {
                    height: 3rem;
                    width: 3rem;
                }

                .Polaris-Thumbnail:not(.Polaris-Thumbnail--sizeLarge),
                .Polaris-ResourceItem__Media.Polaris-ResourceItem__Media--small {
                    width: 5rem;
                    height: 5rem;
                }

                .Polaris-ResourceItem__Media.Polaris-ResourceItem__Media--small .Polaris-Icon {
                    height: 2rem;
                    width: 2rem;
                }

                .Polaris-ResourceItem__Media svg {
                    fill: var(--p-icon);
                }


                .ParsedStock-Container {
                    display: flex;
                    flex-direction: column;
                }
            `}</style>
        </DefaultLayout>  
    )
}

export const getServerSideProps = async ({ query, locale }) => {
    return {
        props: {
            shopifyAppUrl : process.env.SHOPIFY_APP_URL,
            appApiVersion : process.env.APP_API_VERSION,
            ...await serverSideTranslations(locale, ['common', 'products']),
            productId : query.id ? query.id : query.uid
        }
    }
}

export default Product