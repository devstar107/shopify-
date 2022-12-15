import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

import {
    Page,
    Layout,
    Card,
    Stack,
    Spinner,
    ResourceList,
    ResourceItem,
    Banner,
    TextContainer,
    TextStyle,
    Thumbnail,
    Icon,
    Button,
    Tooltip,
    Badge,
    SkeletonBodyText,
    Filters,
    ChoiceList,
    ProgressBar
} from '@shopify/polaris'
import {
    ImageMajor
} from '@shopify/polaris-icons'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { DefaultLayout } from '@layouts'

import { getMarketplaceToken, parseStock, parseSyncStatuses } from '../../lib/utils/products'
import { slugify, isEmpty, disambiguateLabel, sleep } from '../../lib/utils/misc'


const Products = (props) => {
    const { shopOrigin, shopifyAccessToken, shopifyAppUrl, appApiVersion } = props
    const parsedShopOrigin = shopOrigin.replace('.myshopify.com', '')

    const t = {
        common : useTranslation('common').t,
        products : useTranslation('products').t
    }

    const [isSynchronizing, setIsSynchronizing] = useState(false)
    const [isSessionStorageLoaded, setIsSessionStorageLoaded] = useState(false)

    // Events United token
    const [marketplaceToken, setMarketplaceToken] = useState(undefined)

    // Products list
    const [products, setProducts] = useState(undefined)
    const [displayedProducts, setDisplayedProducts] = useState(undefined)

    const [selectedProducts, setSelectedProducts] = useState([])

    // Banner
    const [showBanner, setShowBanner] = useState(false)

    // Progress bar
    const [progress, setProgress] = useState(0)
    const [synchedProducts, setSynchedProducts] = useState(0)

    // Search bar
    const [queryValue, setQueryValue] = useState(null)
    const handleQueryValueRemove = useCallback(() => setQueryValue(null), [])

    // Synch status
    const [syncStatus, setSyncStatus] = useState(null)
    const handleSyncStatus = useCallback( (value) => setSyncStatus(value), [])
    const handleSyncStatusRemove = useCallback( () => setSyncStatus(null), [])

    // Clear all
    const handleClearAll = useCallback(() => {
        handleQueryValueRemove()
        handleSyncStatusRemove()
    }, [
        handleQueryValueRemove,
        handleSyncStatusRemove
    ])
    
    const bulkActions = [{
            content: 'Synchronize',
            onAction: () => synchronize(selectedProducts)
        }
    ]


    const getProducts = async () => {
        let products = []

        await axios.get(`${shopifyAppUrl}/api/${appApiVersion}/${parsedShopOrigin}/products?fields=stock`, {
            headers: {
                'Accept' : 'application/json',
                'Content-Type' : 'application/x-www-form-urlencoded',
                'X-Shopify-Access-Token' : shopifyAccessToken
            }
        }).then((response) => {
            products = response.data.products
        }).catch((err) => {})


        // Parse products stock
        await (async (products) => {
            const productsPromises = products.map(async (product) => {
                product.parsedStock = await parseStock(product, false)
                product.selectedLocationParsedStock = await parseStock(product, true)
            })
    
            await Promise.all(productsPromises)
        })(products)

        return products
    }

    const recursiveUpdate = async (productsToSync, responseArr = []) => {
        if(!productsToSync.length)
            return responseArr

        const starting = Date.now()

        const productToSync = productsToSync[0]
        const product = products.find((product) => product.id == productToSync)

        if(product) {
            // Update stocks
            let requestBody = {
                shop : shopOrigin,
                productId : product.id,
                variants : JSON.stringify(product.variants),
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
                responseArr.push(response.data)
            }).catch((err) => { })
        }

        const ending = Date.now()

        // Sleep function if needed to prevent shopify rate limit throttling
        const remaining = ending - starting > 500
            ? 0
            : 500 - (ending - starting)
            
        await sleep(remaining)

        productsToSync.shift()

        // Update UI
        setProgress(Math.ceil((selectedProducts.length - productsToSync.length) * 100 / selectedProducts.length))
        setSynchedProducts(selectedProducts.length - productsToSync.length)

        return await recursiveUpdate(productsToSync, responseArr)
    }


    const synchronize = async (productsToSync) => {
        // Update UI
        setIsSynchronizing(true)
        setProgress(0)
        setSynchedProducts(0)

        const immutableProducts = [...productsToSync]
        const responseArr = await recursiveUpdate(immutableProducts)

        responseArr.forEach((response) => {
            if(response.responseArr)
                response.responseArr = parseSyncStatuses(response.responseArr)

            sessionStorage.setItem(response.productId, JSON.stringify(response))
        })
        
        handleSynchronizationStatuses(responseArr)

        setIsSynchronizing(false)

        // Unselect all items
        setSelectedProducts([])
    }

    const handleSynchronizationStatuses = (responseArr) => {
        const immutableProducts = [...products]

        immutableProducts.forEach((immutableProduct, i) => {
            responseArr.find((response) => {
                if (response && response.productId == immutableProduct.id) {
                    let status = {}

                    if(response.status)
                        status = response.status
                    else {
                        const hasError = response.responseArr.find((scopedResponse) => scopedResponse.status == 'warning' || scopedResponse.status == 'critical')
                        const hasSuccess = response.responseArr.find((scopedResponse) => scopedResponse.status == 'success')

                        status = hasError
                            ? hasSuccess
                                ? 'warning'
                                : 'critical'
                            : 'success'
                    }

                    immutableProducts[i].status = status
                }

                return response && response.productId == immutableProduct.id
            })
        })

        setDisplayedProducts([...immutableProducts])
    }

    const dismissBanner = () => {
        setShowBanner(false)
        sessionStorage.setItem('dismiss_sync_banner', 'true')
    }


    useEffect(async () => {
        // Show/Hide banner
        if(!sessionStorage.getItem('dismiss_sync_banner'))
            setShowBanner(true)

        // Handle marketplace token on load
        setMarketplaceToken(await getMarketplaceToken(shopifyAppUrl, appApiVersion, parsedShopOrigin, shopifyAccessToken))

        // Get products list
        const products = await getProducts()
        setProducts(products)
        setDisplayedProducts(products)
    }, [])

    useEffect(async () => {
        // Get statuses from session storage
        if(products && !isSessionStorageLoaded) {
            let storageArr = []

            let immutableProducts = [...products]

            immutableProducts.forEach((immutableProduct) => {
                if(sessionStorage.getItem(immutableProduct.id))
                    storageArr.push(JSON.parse(sessionStorage.getItem(immutableProduct.id)))
            })

            handleSynchronizationStatuses(storageArr)
            setIsSessionStorageLoaded(true)
        }
    }, [products])

    useEffect(async () => {
        if(products && displayedProducts) {
            let immutableProducts = [...products]

            immutableProducts = immutableProducts.filter((immutableProduct) => {
                let shouldReturn = true

                // Query value
                if(shouldReturn && queryValue && queryValue.length) {
                    if (slugify(immutableProduct.title).indexOf(slugify(queryValue)) != -1)
                        shouldReturn = true
                    else 
                        shouldReturn = !!immutableProduct.variants.some((variant) => slugify(variant.title).indexOf(slugify(queryValue)) != -1)
                }

                // Synchronization statuses
                if(shouldReturn && syncStatus && syncStatus.length)
                    shouldReturn = syncStatus.indexOf(immutableProduct.status) != -1

                return shouldReturn
            })

            setDisplayedProducts(immutableProducts)
        }
    }, [queryValue, syncStatus])


    const filters = [{
        key: 'syncStatus',
        label: t.products('sync_status'),
        filter: (
        <ChoiceList
            title={t.products('sync_status')}
            titleHidden
            choices = {[
                {
                    label: t.products('status.success'),
                    value: 'success'
                },
                {
                    label: t.products('status.some_error'),
                    value: 'warning'
                },
                {
                    label: t.products('status.attention'),
                    value: 'attention'
                },
                {
                    label: t.products('status.not_synchronized'),
                    value: 'critical'
                },
            ]}
            selected={syncStatus || []}
            onChange={handleSyncStatus}
            allowMultiple
        />
        ),
        shortcut: true
    }]

    const appliedFilters = []
    if (!isEmpty(syncStatus)) {
        const key = 'syncStatus'
        appliedFilters.push({
            key,
            label: disambiguateLabel(key, syncStatus, t),
            onRemove: handleSyncStatusRemove
        })
    }

    const filterControl = (
        <Filters
            filters={filters}
            appliedFilters={appliedFilters}
            queryValue={queryValue}
            onQueryChange={setQueryValue}
            onQueryClear={handleQueryValueRemove}
            onClearAll={handleClearAll}
        />
    )

    return (
        <DefaultLayout shopOrigin={shopOrigin}>
            <Page
                title={t.common('product.plural')}
                fullWidth
            >
                <Layout>
                    <Layout.Section>
                        <Card>
                            {marketplaceToken === undefined || (marketplaceToken !== undefined && (marketplaceToken && marketplaceToken.length) && products === undefined) && 
                                <Card.Section>
                                    <Stack distribution="center">
                                        <Spinner size="large" />
                                    </Stack>
                                </Card.Section>
                            }

                            {marketplaceToken !== undefined && !(marketplaceToken && marketplaceToken.length) &&
                                <Card.Section>
                                    <TextStyle>
                                        {t.products('no_marketplace_token')}
                                    </TextStyle>
                                </Card.Section>
                            }


                            {marketplaceToken !== undefined && marketplaceToken && marketplaceToken.length && products !== undefined && displayedProducts !== undefined &&
                                <>
                                    {showBanner &&
                                        <Card.Section>
                                            <Banner
                                                title={t.products('sync_banner.title')}
                                                status="info"
                                                onDismiss={() => dismissBanner(false)}
                                            >
                                                <div dangerouslySetInnerHTML={{__html: t.products('sync_banner.content')}}></div>
                                            </Banner>
                                        </Card.Section>
                                    }

                                    {isSynchronizing &&
                                        <>
                                            <Card.Section>
                                                <Banner
                                                    title={t.products('duration_banner.title')}
                                                    status="warning"
                                                >
                                                    <div dangerouslySetInnerHTML={{__html: t.products('duration_banner.content')}}></div>
                                                </Banner>
                                            </Card.Section>
                                            <Card.Section>
                                                <Stack vertical>
                                                    <Stack distribution="center">
                                                        <TextContainer>
                                                            <TextStyle variation="strong">{synchedProducts}</TextStyle>
                                                            <TextStyle> / {Math.max(selectedProducts.length, 1)}</TextStyle>
                                                            <TextStyle> synchronized products</TextStyle>
                                                        </TextContainer>
                                                    </Stack>

                                                    <ProgressBar
                                                        progress={progress}
                                                        color="primary"
                                                    />
                                                </Stack>
                                            </Card.Section>
                                        </>
                                    }

                                    <ResourceList
                                        loading={isSynchronizing}
                                        resourceName={{
                                            singular: t.common('product.singular'),
                                            plural: t.common('product.plural')
                                        }}
                                        items={displayedProducts}
                                        selectedItems={selectedProducts}
                                        onSelectionChange={setSelectedProducts}
                                        bulkActions={bulkActions}
                                        filterControl={filterControl}
                                        renderItem={(item) => {
                                            const { id, images, title, variants, parsedStock, selectedLocationParsedStock, status } = item

                                            return (
                                                <ResourceItem
                                                    id={id}
                                                    url={`/products/${id}?shop=${shopOrigin}`}
                                                >
                                                    <div className="Polaris-ResourceItem-Grid">
                                                        {/* Thumbnail */}
                                                        {images && images.length
                                                            ?
                                                                <Thumbnail source={images[0].src} />
                                                            :
                                                                <div className="Polaris-ResourceItem__Media">
                                                                    <Icon source={ImageMajor} />
                                                                </div>
                                                        }

                                                        {/* Title */}
                                                        <TextStyle variation="strong">
                                                            {title}
                                                        </TextStyle>

                                                        {/* Stocks */}
                                                        <Stack vertical>
                                                            {parsedStock !== null
                                                                ?
                                                                    <TextStyle>
                                                                        {t.products('inStockForVariants')
                                                                            .replace('{parsedStock}', parsedStock)
                                                                            .replace('{variantsLength}', variants.length)
                                                                        }
                                                                    </TextStyle>
                                                                :
                                                                    <div className="Polaris-SkeletonBodyText">
                                                                        <SkeletonBodyText lines={1} />
                                                                    </div>
                                                            }
                                                            {selectedLocationParsedStock !== null
                                                                ?
                                                                    <TextStyle>
                                                                        {t.products('inStockForSelectedLocation')
                                                                            .replace('{selectedLocationParsedStock}', selectedLocationParsedStock)
                                                                        }
                                                                    </TextStyle>
                                                                :
                                                                    <div className="Polaris-SkeletonBodyText">
                                                                        <SkeletonBodyText lines={1} />
                                                                    </div>
                                                            }
                                                        </Stack>

                                                        {/* Status */}
                                                        <Stack vertical>
                                                            {status &&
                                                                <Tooltip content={t.common('click_for_more_details')}>
                                                                    <Badge status={status}>
                                                                        {t.products(`status.${
                                                                            status == 'warning' 
                                                                                ? 'some_error' 
                                                                                : status == 'critical'
                                                                                    ? 'not_synchronized'
                                                                                    : status }`
                                                                            )
                                                                        }
                                                                    </Badge>
                                                                </Tooltip>
                                                            }
                                                        </Stack>

                                                        {/* Action */}
                                                        <Button
                                                            asize="slim"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                synchronize([id])
                                                            }}
                                                        >
                                                            {t.products('synchronize')}
                                                        </Button>
                                                    </div>
                                                </ResourceItem>
                                            )
                                        }}
                                    />
                                </> 
                            }
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>

            <style jsx global>{`
                .Polaris-ResourceItem-Grid {
                    display: grid;
                    grid-template-columns: 5.2rem .3fr .7fr 200px 135px;
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
                    align-items: center !important;
                }

                .Polaris-ResourceItem__Media {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border-radius: var(--p-border-radius-base,3px);
                    border: .1rem solid var(--p-border-subdued);
                    background: var(--p-surface,#f9fafb);
                    width: 5rem;
                    height: 5rem;
                }

                .Polaris-ResourceItem__Media svg {
                    fill: var(--p-icon);
                }

                .Polaris-SkeletonBodyText {
                    max-width: 250px;
                    margin: .3rem 0;
                }
            `}</style>
        </DefaultLayout>  
    )
}

export const getServerSideProps = async ({ locale }) => {
    return {
        props: {
            shopifyAppUrl : process.env.SHOPIFY_APP_URL,
            appApiVersion : process.env.APP_API_VERSION,
            ...await serverSideTranslations(locale, ['common', 'products'])
        }
    }
}

export default Products