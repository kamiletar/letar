import { UmamiScript } from '@letar/analytics'
import { AnalyticsGate } from '@letar/ui'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { Providers } from '@/app/_components/providers'
import { AppToaster } from '@/app/_components/ui/toaster'
import { routing } from '@/i18n/routing'
import { CookieConsent } from './_components/cookie-consent'
import { Header } from './_components/header'
import { CORE_SCALE_COUNT, TOTAL_QUESTIONS } from './_data/bank-stats'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isRu = locale === 'ru'

  const t = await getTranslations({ locale, namespace: 'meta' })
  const siteName = t('siteName')
  const title = t('title')
  const description = t('description', { totalQuestions: TOTAL_QUESTIONS, coreScales: CORE_SCALE_COUNT })

  // Без metadataBase Next.js строит OpenGraph-ссылки и canonical относительными,
  // а соцсети и поисковики требуют абсолютных
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL

  return {
    ...(baseUrl ? { metadataBase: new URL(baseUrl) } : {}),
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: ['архетип', 'тест личности', 'психология', 'DSM-5', 'типология'],
    authors: [{ name: 'Letar' }],
    openGraph: {
      type: 'website',
      locale: isRu ? 'ru_RU' : 'en_US',
      siteName,
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export const viewport: Viewport = {
  // Цвет адресной строки — фон страницы (`bg` = gray.50 / gray.900) по системной теме.
  // Ручной выбор темы в приложении сюда не доезжает: `<meta>` читается до гидратации.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#18181B' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers locale={locale}>
            <Header />
            {children}
            <AppToaster />
            <CookieConsent />
          </Providers>
        </NextIntlClientProvider>
        <AnalyticsGate appKey="archetest">
          <UmamiScript />
        </AnalyticsGate>
      </body>
    </html>
  )
}
