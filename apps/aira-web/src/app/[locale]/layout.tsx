import { UmamiScript } from '@letar/analytics'
import { AnalyticsGate, CookieBanner } from '@letar/ui'
import type { Metadata, Viewport } from 'next'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { HomeJsonLd } from '@/app/_components/json-ld'
import { Providers } from '@/app/_components/providers'
import { SkipToContent } from '@/app/_components/skip-to-content'
import { ALL_LOCALES, routing, RTL_LOCALES } from '@/i18n/routing'
import { BASE_URL, SITE_NAME } from '@/lib/seo'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

/** Статическая генерация для всех локалей */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/** Путь для локали (по правилам `as-needed`) */
function localePath(locale: string): string {
  return locale === routing.defaultLocale ? '/' : `/${locale}`
}

/** Метаданные с hreflang альтернативами + canonical для SEO */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  // hreflang для всех 10 локалей
  const languages: Record<string, string> = {}
  for (const loc of ALL_LOCALES) {
    languages[loc] = localePath(loc)
  }
  languages['x-default'] = '/'

  const canonical = localePath(locale)

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: t('title'),
      template: `%s | ${SITE_NAME}`,
    },
    description: t('description'),
    keywords: ['aira', 'messenger', 'post-quantum', 'p2p', 'encryption', 'privacy', 'releases'],
    authors: [{ name: SITE_NAME, url: BASE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: 'website',
      locale,
      alternateLocale: ALL_LOCALES.filter((l) => l !== locale),
      siteName: SITE_NAME,
      title: t('title'),
      description: t('description'),
      url: canonical,
      // images автоматически подхватятся из opengraph-image.tsx в том же роут-сегменте
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      // images автоматически подхватятся из twitter-image.tsx или opengraph-image.tsx
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '32x32' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    manifest: '/manifest.webmanifest',
  }
}

export const viewport: Viewport = {
  themeColor: '#14B8A6',
  width: 'device-width',
  initialScale: 1,
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const [messages, t] = await Promise.all([getMessages(), getTranslations({ locale, namespace: 'metadata' })])
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        <HomeJsonLd locale={locale} description={t('description')} />
        <Providers>
          <NextIntlClientProvider messages={messages}>
            <SkipToContent />
            {children}
            <CookieBanner
              appKey="aira-web"
              consentApiUrl={null}
              privacyUrl={`${localePath(locale) === '/' ? '' : localePath(locale)}/privacy`}
            />
          </NextIntlClientProvider>
        </Providers>
        <AnalyticsGate appKey="aira-web">
          <UmamiScript />
        </AnalyticsGate>
      </body>
    </html>
  )
}
