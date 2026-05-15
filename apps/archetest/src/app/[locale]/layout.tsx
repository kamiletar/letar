import { UmamiScript } from '@letar/analytics'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { Providers } from '@/app/_components/providers'
import { AppToaster } from '@/app/_components/ui/toaster'
import { routing } from '@/i18n/routing'
import { Header } from './_components/header'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  title: {
    default: 'Архетест — Тест типа личности',
    template: '%s | Архетест',
  },
  description: 'Узнай свой архетип личности. 1955 вопросов, 13 шкал — по 50 за сессию, проходи в удобном темпе.',
  keywords: ['архетип', 'тест личности', 'психология', 'DSM-5', 'типология'],
  authors: [{ name: 'Letar' }],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Архетест',
    title: 'Архетест — Тест типа личности',
    description: 'Узнай свой архетип личности. 1955 вопросов, 13 шкал — по 50 за сессию, проходи в удобном темпе.',
  },
  robots: {
    index: true,
    follow: true,
  },
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
          </Providers>
        </NextIntlClientProvider>
        <UmamiScript />
      </body>
    </html>
  )
}
