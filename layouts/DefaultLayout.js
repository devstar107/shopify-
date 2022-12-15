import React, { useEffect } from 'react'
import { useRouter } from 'next/router'

import { Frame, Navigation } from '@shopify/polaris'
import { SettingsMajor, ProductsMajor, HintMajor } from '@shopify/polaris-icons'

import { useTranslation } from 'next-i18next'

const DefaultLayout = (props) => {
    const { children, shopOrigin } = props

    const router = useRouter()

    const t = {
        common : useTranslation('common').t
    }
    
    const translations = {
        settings : t.common('settings'),
        products : t.common('product.plural'),
        faq :  t.common('faq_and_help')
    }

    return (
        <Frame
            navigation={
                <Navigation location={router.pathname}>
                    <Navigation.Section
                        items={[
                            {
                                url: `/?shop=${shopOrigin}`,
                                label : translations.settings,
                                icon: SettingsMajor
                            },
                            {
                                url: `/products?shop=${shopOrigin}`,
                                label : translations.products,
                                icon: ProductsMajor
                            },
                            {
                                url : `/faq?shop=${shopOrigin}`,
                                label : translations.faq,
                                icon : HintMajor
                            }
                        ]}
                    />
                </Navigation>
            }
        >       
            {children}

            {/* 💩 UI Tweak because of first element staying with active styles */}
            {router.pathname !== '/' &&
                <style jsx global>{`
                    .Polaris-Navigation__ListItem:first-child a {
                        background : 0 0 !important;
                        color: var(--p-text) !important;
                        font-weight : 400;
                    }

                    .Polaris-Navigation__ListItem:first-child svg {
                        fill: var(--p-icon) !important;
                    }

                    .Polaris-Navigation__ListItem:first-child a::before {
                        content : none;
                    }
                `}</style>
            }
        </Frame>
    )
}

export default DefaultLayout