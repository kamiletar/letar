import { ALL_LOCALES, routing, RTL_LOCALES } from '@/i18n/routing'
import { UmamiScript } from '@letar/analytics'
import { isProductionDomain } from '@letar/seo'
import { CookieBanner } from '@letar/ui'
import type { Metadata, Viewport } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { JetBrains_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { ChakraProviders } from '../_components/providers'
import { Toolbar } from '../_components/toolbar'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['cyrillic', 'latin', 'latin-ext', 'greek', 'vietnamese'],
  variable: '--font-mono',
})

const PRODUCTION_URL = 'https://time.letar.best'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata(_props: Props): Promise<Metadata> {
  const messages = await getMessages()
  const metadata = messages.metadata as { title: string; description: string }

  // Генерируем alternates для всех 40 локалей
  const languages: Record<string, string> = {}
  for (const locale of ALL_LOCALES) {
    languages[locale] = locale === 'ru' ? '/' : `/${locale}/`
  }

  return {
    title: metadata.title,
    description: metadata.description,
    metadataBase: new URL(PRODUCTION_URL),
    // Раньше было захардкожено index: true — индексировался и staging (PLAN-INFRA.md §33)
    robots: { index: isProductionDomain(PRODUCTION_URL), follow: isProductionDomain(PRODUCTION_URL) },
    alternates: { languages },
  }
}

export const viewport: Viewport = {
  themeColor: '#10B981',
  width: 'device-width',
  initialScale: 1,
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={jetbrainsMono.variable} style={{ fontFamily: 'var(--font-mono), monospace' }}>
        <ChakraProviders>
          <NextIntlClientProvider messages={messages}>
            <Toolbar />
            {children}
          </NextIntlClientProvider>
          <CookieBanner appKey="time" />
        </ChakraProviders>
        <UmamiScript />
      </body>
    </html>
  )
}
