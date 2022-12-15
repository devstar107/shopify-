import React, { useState, useCallback, useContext } from 'react'
import axios from 'axios'

import {
    Page,
    Layout,
    Card,
    Stack,
    Button,
    Collapsible,
    TextContainer,
    TextStyle,
    Toast
} from '@shopify/polaris'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { DefaultLayout } from '@layouts'

import { Context as AppBridgeContext } from '@shopify/app-bridge-react'
import { Redirect } from '@shopify/app-bridge/actions'


const Faq = (props) => {
    const appBridge = useContext(AppBridgeContext)
    const redirect = Redirect.create(appBridge)
    
    const { shopOrigin, shopifyAccessToken, shopifyAppUrl, appApiVersion } = props
    const parsedShopOrigin = shopOrigin.replace('.myshopify.com', '')
    
    const t = {
        common : useTranslation('common').t,
        faq : useTranslation('faq').t
    }

    const [isCreating, setIsCreating] = useState(false)

    const [questionsOpen, setQuestionsOpen] = useState(
        t.faq('questions', { joinArrays : ',' }).split(',').map((question) => {
            return { open : false }
        })
    )

    // Toast
    const [toastContent, setToastContent] = useState('')
    const [toastError, setToastError] = useState(false)
    const [toastAction, setToastAction] = useState(null)
    const updateToastContent = useCallback((content, hasError = false, action = null) => {
        setToastContent(content)
        setToastError(hasError)
        setToastAction(action)
    }, [])


    const handleToggle = useCallback((i) => 
        setQuestionsOpen((prevQuestions) => {
            let arr = []

            prevQuestions.forEach((prevQuestion, j) => {
                if (j == i)
                    prevQuestion.open = !prevQuestion.open

                arr.push(prevQuestion)
            })

            return arr
        })
    , [])


    const createProduct = async () => {
        setIsCreating(true)

        let productResponse = null
        let error = false

        await axios.post(`${shopifyAppUrl}/api/${appApiVersion}/${parsedShopOrigin}/products/create`, {
            headers: {
                'Accept' : 'application/json',
                'Content-Type' : 'application/x-www-form-urlencoded',
                'X-Shopify-Access-Token' : shopifyAccessToken
            }
        }).then((response) => {
            productResponse = response.data
        }).catch((err) => {
            error = err
        })

        // Show toast
		if(error)
            updateToastContent(t.common('server_error'), true)
        else {
            const action = {
                content : t.common('view_product'),
                onAction : () => goToProduct(productResponse.productId)
            }
            updateToastContent(t.common('created_successfully'), false, action)
        }

        setIsCreating(false)
    }

    const goToProduct = (productId) => {
        redirect.dispatch(Redirect.Action.ADMIN_PATH, `/products/${productId}`)
    }


    const toast = toastContent && toastContent.length
    ? (
        <Toast
            content={toastContent}
            onDismiss={() => updateToastContent(null)}
            error={toastError}
            action={toastAction}
        />
    )
    : null

    return (
        <DefaultLayout
            shopOrigin={shopOrigin}
            location="/faq"
        >
            <Page
                title={t.common('faq_and_help')}
                fullWidth
            >
                <Layout>
                    <Layout.Section>
                    <Card
                            title={t.common('help')}
                            sectioned
                        >
                            <Stack vertical>
                                <TextContainer>
                                    <TextStyle>
                                        <div dangerouslySetInnerHTML={{__html: t.faq(`help.infos`)}}></div>
                                    </TextStyle>
                                </TextContainer>
                                <img
                                    className="Help-Image"
                                    src="/images/help-integration.png"
                                ></img>
                                <TextContainer>
                                    <TextStyle>
                                        <div dangerouslySetInnerHTML={{__html: t.faq(`help.create_product_infos`)}}></div>
                                    </TextStyle>
                                </TextContainer>
                                <Button
                                    primary
                                    onClick={() => createProduct()}
                                    loading={isCreating}
                                >
                                    {t.common(`create_product`)}
                                </Button>
                            </Stack>
                        </Card>
                        <Card
                            title={t.common('faq')}
                            sectioned
                        >
                            {t.faq('questions', { joinArrays : ',' }).split(',').map((question, i) => (
                                <Stack
                                    vertical
                                    key={`stack_${i}`}
                                >
                                    <Button
                                        onClick={() => handleToggle(i)}
                                        ariaExpanded={questionsOpen[i].open}
                                        aria-controls={`basic-collapsible-${i}`}
                                        fullWidth
                                        textAlign="left"
                                        disclosure={questionsOpen[i].open ? 'up' : 'down'}
                                    >
                                        {t.faq(`questions.${i}.name`).replace(/{company_name}/g, t.common('company_name'))}
                                    </Button>
                                    <Collapsible
                                        open={questionsOpen[i].open}
                                        id={`basic-collapsible-${i}`}
                                        transition={{
                                            duration: '500ms',
                                            timingFunction: 'ease-in-out'
                                        }}
                                        expandOnPrint
                                    >
                                        <div dangerouslySetInnerHTML={{__html: t.faq(`questions.${i}.response`).replace(/{company_name}/g, t.common('company_name'))}}></div>
                                        <br />
                                    </Collapsible>
                                </Stack>
                            ))}
                        </Card>
                    </Layout.Section>
                </Layout>

                {toast}
            </Page>

            <style jsx global>{`
                .Help-Image,
                .Polaris-Collapsible img {
                    width: 100%;
                    max-height: 350px;
                    object-fit: contain;
                    margin: 1em 0;
                    border-radius: var(--p-border-radius-base);
                    overflow: hidden;
                    background: var(--p-background);
                }

                .Polaris-Collapsible img + img {
                    margin-top : calc(-1em - 6px);
                }

                .Polaris-Collapsible img:first-child {
                    margin-top: 0;
                }

                .Polaris-Collapsible img:last-child {
                    margin-bottom: 0;
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
            ...await serverSideTranslations(locale, ['common', 'faq'])
        }
    }
}

export default Faq