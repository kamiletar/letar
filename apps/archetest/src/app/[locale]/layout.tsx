import { UmamiScript } from '@letar/analytics'
import { AnalyticsGate } from '@letar/ui'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
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

  const siteName = isRu ? 'Архетест' : 'Archetest'
  const title = isRu ? 'Архетест — Тест типа личности' : 'Archetest — Personality Type Test'
  const description = isRu
    ? `Узнайте свой архетип личности. ${TOTAL_QUESTIONS} вопросов, ${CORE_SCALE_COUNT} шкалы — по 50 за сессию, в удобном темпе.`
    : `Discover your personality archetype. ${TOTAL_QUESTIONS} questions, ${CORE_SCALE_COUNT} scales — 50 per session, at your own pace.`

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
  themeColor: '#7C3AED',
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
          <Providers>
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
