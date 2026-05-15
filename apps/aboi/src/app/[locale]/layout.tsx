import { Providers } from '@/app/_components/providers'
import { routing } from '@/i18n/routing'
import { UmamiScript } from '@letar/analytics'
import type { Metadata, Viewport } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { Header } from './_components/header'

const SITE_NAME = 'НейроАбоИ'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://neyroaboi.ru'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const messages = await getMessages({ locale })
  const meta = (messages as { metadata?: { title?: string; description?: string } }).metadata ?? {}
  const title = meta.title ?? `${SITE_NAME} — обои с зашитыми аффирмациями`
  const description = meta.description ?? 'Настенные обои с зашитыми аффирмациями.'

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
      ],
      apple: '/apple-icon.png',
    },
    manifest: '/manifest.json',
    keywords: [
      'обои',
      'нейрообои',
      'аффирмации',
      'паттерн',
      'декор',
      'интерьер',
      'обои на флизелине',
      'дизайнерские обои',
    ],
    alternates: {
      canonical: locale === routing.defaultLocale ? '/' : `/${locale}/`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, l === routing.defaultLocale ? '/' : `/${l}/`])),
    },
    openGraph: {
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : locale === 'en' ? 'en_US' : 'zh_CN',
      url: BASE_URL,
      siteName: SITE_NAME,
      title,
      description,
    },
    robots: {
      index: process.env.NODE_ENV === 'production',
      follow: process.env.NODE_ENV === 'production',
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#C25E3A',
  width: 'device-width',
  initialScale: 1,
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages({ locale })

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <Header />
            {children}
          </Providers>
        </NextIntlClientProvider>
        <UmamiScript />
      </body>
    </html>
  )
}
