import { UmamiScript } from '@letar/analytics'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { BASE_URL, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME } from '@/lib/seo'

import { WebSiteJsonLd } from './_components/json-ld'
import { Providers } from './_components/providers'
import './globals.css'

/**
 * SEO и PWA метаданные.
 */
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Свод законов Руси | Pravda',
    template: '%s | Pravda',
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: 'Pravda' }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: BASE_URL,
    siteName: SITE_NAME,
    title: 'Свод законов Руси',
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Свод законов Руси | Pravda',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Свод законов Руси | Pravda',
    description: SITE_DESCRIPTION,
    images: ['/og/home.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  // PWA
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Правда',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

/**
 * Viewport для PWA.
 */
export const viewport: Viewport = {
  themeColor: '#E53E3E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <WebSiteJsonLd />
        <Providers>{children}</Providers>
        <UmamiScript />
      </body>
    </html>
  )
}
