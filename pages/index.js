import React, { useState, useCallback, useEffect } from 'react'
import axios from 'axios'

import {
    Page,
    Layout,
    Card,
    Stack,
    TextStyle,
    Tooltip,
    ButtonGroup,
    Button,
    TextField,
    Toast,
    Icon,
    ResourceList,
    ResourceItem,
    SkeletonThumbnail,
    SkeletonBodyText,
    SkeletonDisplayText,
    Badge,
    Checkbox
} from '@shopify/polaris'

import { LocationMajor, RiskMinor } from '@shopify/polaris-icons'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { DefaultLayout } from '@layouts'

import { getMarketplaceToken } from '../lib/utils/products'


const Home = (props) => {
    const t = {
        common : useTranslation('common').t,
        home : useTranslation('home').t
    }

    const { shopOrigin, shopifyAccessToken, shopifyAppUrl, appApiVersion } = props
    const parsedShopOrigin = shopOrigin.replace('.myshopify.com', '')

    // Events United token
    const [marketplaceToken, setMarketplaceToken] = useState(undefined)
    const handleEventsUnitedTokenChange = useCallback((newValue) => setMarketplaceToken(newValue), [])

    // Marketplace token error
    const [marketplaceTokenError, setMarketplaceTokenError] = useState(false)
    const handleMarketplaceTokenError = useCallback((newError) => setMarketplaceTokenError(newError), [])

    // Toast
    const [toastContent, setToastContent] = useState('')
    const [toastError, setToastError] = useState(false)
    const updateToastContent = useCallback((content, hasError = false) => {
        setToastContent(content)
        setToastError(hasError)
    }, [])

    // Locations & Displayed locations
    const [locations, setLocations] = useState(null)
    const [displayedLocation, setDisplayedLocation] = useState(null)

    // Tem data (resource list items when changing location)
    const [isChangingLocation, setIsChangingLocation] = useState(false)
    const toggleLocationChange = useCallback((status) => {
        // Reset temp data
        if (status == false) {
            updateSelectedLocation(null)
            handleLocationWarningPass(false)
            handleLocationWarningError(false)
            handleSelectedLocationError(false)
        }

        setIsChangingLocation(status)
    }, [])

    // Location warning pass checkbox
    const [passLocationWarning, setPassLocationWarning] = useState(false)
    const handleLocationWarningPass = useCallback((newChecked) => {
        setPassLocationWarning(newChecked)
        handleLocationWarningError(!newChecked)
    }, [])

    // Error if checkobx is not selected
    const [locationWarningError, setLocationWarningError] = useState(false)
    const handleLocationWarningError = useCallback((newError) => setLocationWarningError(newError), [])

    // Temp selected location
    const [tempSelectedLocation, setTempSelectedLocation] = useState(null)
    const updateSelectedLocation = useCallback((location) => {
        setTempSelectedLocation(location)

        if (location && location.id)
            handleSelectedLocationError(false)
    }, [])

    // Error if no selected location
    const [selectedLocationError, setSelectedLocationError] = useState(false)
    const handleSelectedLocationError = useCallback((newError) => setSelectedLocationError(newError), [])

    useEffect(async () => {
        // Handle displayed location on load
        const locations = await getAllLocations()
        const selectedLocation = await getSelectedLocation()

        if (!locations)
            return

        setLocations(locations)

        setDisplayedLocation(() => {
            const displayedLocation = selectedLocation
                ? locations.filter((location) => location.id == selectedLocation)
                : [locations[0]]

            return displayedLocation
        })

        // Handle marketplace token on load
        const marketplaceToken = await getMarketplaceToken(shopifyAppUrl, appApiVersion, parsedShopOrigin, shopifyAccessToken)
        setMarketplaceToken(marketplaceToken)
    }, [])


    const copyToClipBoard = () => {
        // Create DOM elem to stock the button value that we want to copy
        let input = document.createElement('input')
        input.value = document.getElementById('tokenToCopy').innerText
        input.id = 'copyToClipBoard'

        // Add DOM elem to... DOM
        document.body.appendChild(input)

        // Select and copy content to clipboard
        input.select()
        document.execCommand('copy')

        // Remove DOM elem
        document.body.removeChild(input)

        // Show toast
        updateToastContent(t.home('copied_to_clipboard'))
    }


    const getAllLocations = async () => {
        let locations = []

        await axios.get(`${shopifyAppUrl}/api/${appApiVersion}/${parsedShopOrigin}/locations`, {
            headers: {
                'Accept' : 'application/json',
                'Content-Type' : 'application/x-www-form-urlencoded',
                'X-Shopify-Access-Token' : shopifyAccessToken
            }
        }).then((response) => {
            locations = response.data.locations
        }).catch((err) => {})

        return locations
    }

    const getSelectedLocation = async () => {
        let selectedLocation = null

        await axios.get(`${shopifyAppUrl}/api/${appApiVersion}/${parsedShopOrigin}/selected-location`, {
            headers: {
                'Accept' : 'application/json',
                'Content-Type' : 'application/x-www-form-urlencoded',
                'X-Shopify-Access-Token' : shopifyAccessToken
            }
        }).then((response) => {
            selectedLocation = response.data.selectedLocationId
        }).catch((err) => {})

        return selectedLocation
    }

    const setSelectedLocation = async (id) => {
        let result = {}

        let requestBody = {
            selectedLocationId : id
        }

        requestBody = Object.keys(requestBody).map((key) => {
            return encodeURIComponent(key) + '=' + encodeURIComponent(requestBody[key])
        }).join('&')

        await axios.put(`${shopifyAppUrl}/api/${appApiVersion}/${parsedShopOrigin}/selected-location`, requestBody, {
            headers: {
                'Accept' : 'application/json',
                'Content-Type' : 'application/x-www-form-urlencoded',
                'X-Shopify-Access-Token' : shopifyAccessToken
            }
        }).then((response) => {
            result = { success : 200 }
        }).catch((err) => {
            result = { error : 429 }
        })

        return result
    }


    const submitLocationChange = async () => {
        const hasError = (
            !passLocationWarning
            || !(tempSelectedLocation && tempSelectedLocation.id)
        )

        handleLocationWarningError(!passLocationWarning)
        handleSelectedLocationError(!(tempSelectedLocation && tempSelectedLocation.id))

        if (!hasError) {
            const response = await setSelectedLocation(tempSelectedLocation.id)

            if (response.success) {
                setDisplayedLocation([tempSelectedLocation])
                toggleLocationChange(false)
                updateToastContent(t.home('location_changed_successfully'))
            }
            else {
                updateToastContent(`${t.common('server_error')}, ${t.common('try_again')}`, true)
            }
        }
    }


    const saveMarketplaceToken = async () => {
        if (marketplaceToken && marketplaceToken.length) {
            handleMarketplaceTokenError(false)

            let result = {}

            let requestBody = {
                marketPlaceToken : marketplaceToken
            }

            requestBody = Object.keys(requestBody).map((key) => {
                return encodeURIComponent(key) + '=' + encodeURIComponent(requestBody[key])
            }).join('&')

            await axios.put(`${shopifyAppUrl}/api/${appApiVersion}/${parsedShopOrigin}/redis/marketplace-token`, requestBody, {
                headers: {
                    'Accept' : 'application/json',
                    'Content-Type' : 'application/x-www-form-urlencoded',
                    'X-Shopify-Access-Token' : shopifyAccessToken
                }
            }).then((response) => {
                updateToastContent(t.home('token_saved_successfully'))
                result = { success : 200 }
            }).catch((err) => {
                updateToastContent(`${t.common('server_error')}, ${t.common('try_again')}`, true)
                result = { error : 429 }
            })

            return result
        }
        else {
            handleMarketplaceTokenError(t.common('empty_input_error'))
        }
    }


    const copyTokenButton = shopifyAccessToken && shopifyAccessToken.length
        ? (
            <Button
                outline
                onClick={copyToClipBoard}
                id="tokenToCopy"
            >
                {shopifyAccessToken}
            </Button>
        )
        : <Button loading />

    const toast = toastContent && toastContent.length
        ? (
            <Toast
                content={toastContent}
                onDismiss={() => updateToastContent(null)}
                error={toastError}
            />
        )
        : null

    return (
        <DefaultLayout shopOrigin={shopOrigin}>
            <Page
                title="Parameters"
                fullWidth
            >
                <Layout>
                    <Layout.Section>
                        <Card>
                            <Card.Section title={t.common('selected_location')}>
                                <Stack vertical>
                                    {isChangingLocation &&
                                        <Badge status="warning">
                                            <Icon source={RiskMinor} />
                                            <span>
                                                {t.home('location_warning')}
                                            </span>
                                        </Badge>
                                    }

                                    {!(displayedLocation && !!displayedLocation.length) &&
                                        <Stack vertical>
                                            <Stack wrap={false}>
                                                <div className="Polaris-ResourceItem__Media-Skeleton">
                                                    <SkeletonThumbnail size="small" />
                                                </div>
                                                <div className="Polaris-ResourceItem__Content-Skeleton">
                                                    <SkeletonBodyText lines={3} />
                                                </div>
                                            </Stack>
                                            <SkeletonDisplayText size="medium" />
                                        </Stack>
                                    }
                                    {displayedLocation && !!displayedLocation.length &&
                                        <Stack vertical>
                                            <div
                                                className={`
                                                    Polaris-ResourceItem__List-Container
                                                    ${selectedLocationError
                                                        ? 'has-error'
                                                        : ''
                                                    }
                                                `}
                                            >
                                                <ResourceList
                                                    resourceName={{
                                                        singular: t.common('location.singular'),
                                                        plural: t.common('location.plural')
                                                    }}
                                                    items={isChangingLocation ? locations : displayedLocation}
                                                    renderItem={(item) => {
                                                        const { id, name, address1, zip, city, country, phone } = item

                                                        return (
                                                            <div
                                                                className={`
                                                                    Polaris-ResourceItem__ListItem-Container
                                                                    ${tempSelectedLocation && tempSelectedLocation.id == item.id
                                                                        ? 'is-selected'
                                                                        : ''
                                                                    }
                                                                `}
                                                            >
                                                                <ResourceItem
                                                                    id={id}
                                                                    url={null}
                                                                    media={
                                                                        <Icon source={LocationMajor} />
                                                                    }
                                                                    onClick={() => updateSelectedLocation(item)}
                                                                >
                                                                    <h3>
                                                                        <TextStyle variation="strong">{name}</TextStyle>
                                                                    </h3>
                                                                    <div>{address1}, {zip} {city}, {country}</div>
                                                                    <div>{phone}</div>
                                                                </ResourceItem>
                                                            </div>
                                                        )
                                                    }}
                                                />
                                            </div>

                                            {locations && locations.length > 1 && !isChangingLocation &&
                                                <ButtonGroup>
                                                    <Button onClick={() => toggleLocationChange(true)}>
                                                        {t.home('change_location')}
                                                    </Button>
                                                </ButtonGroup>
                                            }

                                            {isChangingLocation &&
                                                <Stack vertical>
                                                    <Checkbox
                                                        label={t.home('location_pass_warning')}
                                                        checked={passLocationWarning}
                                                        onChange={handleLocationWarningPass}
                                                        error={locationWarningError ? t.home('need_consent') : false}
                                                    />
                                                    <ButtonGroup>
                                                        <Button
                                                            plain
                                                            onClick={() => toggleLocationChange(false)}
                                                        >
                                                            {t.common('cancel')}
                                                        </Button>
                                                        <Button
                                                            primary
                                                            onClick={() => submitLocationChange()}
                                                        >
                                                            {t.common('save')}
                                                        </Button>
                                                    </ButtonGroup>
                                                </Stack>
                                            }
                                        </Stack>
                                    }
                                </Stack>
                            </Card.Section>
                            <Card.Section title={t.common('shopify_token')}>
                                <Stack vertical>
                                    <TextStyle>
                                        {t.home('synchronize_app').replace('{company_name}', t.common('company_name'))}
                                    </TextStyle>
                                    <Tooltip content={t.home('copy_token')}>
                                        {copyTokenButton}
                                    </Tooltip>
                                </Stack>
                            </Card.Section>
                            <Card.Section title={t.common('eventsunited_token').replace('{company_name}', t.common('company_name'))}>
                                <Stack vertical>
                                    <TextStyle>
                                        {t.home('add_eventsunited_token').replace('{company_name}', t.common('company_name'))}
                                    </TextStyle>
                                    {marketplaceToken !== undefined &&
                                        <Stack vertical>
                                            <TextField
                                                value={marketplaceToken}
                                                onChange={handleEventsUnitedTokenChange}
                                                error={marketplaceTokenError}
                                            />
                                            <Button
                                                primary
                                                onClick={saveMarketplaceToken}
                                            >
                                                {t.home('save_token')}
                                            </Button>
                                         </Stack>
                                    }
                                    {marketplaceToken === undefined &&
                                        <Stack vertical>
                                            <div className="Polaris-SkeletonDisplayInput">
                                                <SkeletonDisplayText size="medium" />
                                            </div>
                                            <SkeletonDisplayText size="medium" />
                                        </Stack>
                                    }
                                </Stack>
                            </Card.Section>
                        </Card>
                    </Layout.Section>
                </Layout>

                {toast}
            </Page>

            <style jsx global>{`
                .Polaris-ResourceItem__List-Container {
                    border-radius: var(--p-border-radius-wide);
                    border: solid .2rem transparent;
                }

                .Polaris-ResourceItem__List-Container.has-error {
                    border: solid .2rem var(--p-border-critical);
                }

                .Polaris-ResourceItem__ListItem-Container .Polaris-ResourceItem__ListItem .Polaris-ResourceItem__ItemWrapper {
                    border: solid .2rem transparent;
                }

                .Polaris-ResourceItem__ListItem-Container.is-selected .Polaris-ResourceItem__ListItem .Polaris-ResourceItem__ItemWrapper {
                    border: solid .2rem var(--p-border-success);
                    border-radius: var(--p-border-radius-wide);
                }

                .Polaris-ResourceItem__ListItem-Container:first-child .Polaris-ResourceItem__ListItem .Polaris-ResourceItem__ItemWrapper {
                    border-top-left-radius: var(--p-border-radius-wide) !important;
                    border-top-right-radius: var(--p-border-radius-wide) !important;
                }

                .Polaris-ResourceItem__ListItem-Container:last-child .Polaris-ResourceItem__ListItem .Polaris-ResourceItem__ItemWrapper {
                    border-bottom-left-radius: var(--p-border-radius-wide) !important;
                    border-bottom-right-radius: var(--p-border-radius-wide) !important;
                }

                .Polaris-ResourceItem__ListItem-Container:first-child:last-child {
                    pointer-events: none;
                }

                .Polaris-ResourceItem__ListItem-Container:not(:first-child) {
                    border-top: 0.1rem solid var(--p-divider);
                }

                .Polaris-ResourceItem__ListItem .Polaris-ResourceItem__ItemWrapper {
                    border-radius: 0 !important;
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

                .Polaris-ResourceItem__Content {
                    margin: auto auto auto 0;
                }


                .Polaris-SkeletonThumbnail--sizeSmall {
                    width: 5rem;
                    height: 5rem;
                    border-radius: var(--p-border-radius-base,3px);
                }

                .Polaris-ResourceItem__Content-Skeleton {
                    width: 300px;
                    margin: 0;
                }

                .Polaris-SkeletonDisplayInput .Polaris-SkeletonDisplayText__DisplayText {
                    max-width: 100%;
                }


                .Polaris-Badge .Polaris-Icon {
                    padding: .2rem;
                    margin-right: 3px;
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
            ...await serverSideTranslations(locale, ['common', 'home'])
        }
    }
}

export default Home
