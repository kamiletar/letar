import { AnalyticsConsent } from '@/app/_components/analytics-consent'
import { Provider } from '@/app/_components/ui/provider'
import { CookieBanner } from '@letar/ui'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://letar.best'),
  title: {
    template: '%s | Letar',
    default: 'Letar — Проекты и приложения',
  },
  description:
    'Экосистема веб-приложений, десктопных и мобильных проектов. E-commerce, образование, медиа, аналитика и инфраструктура.',
  keywords: ['letar', 'проекты', 'веб-приложения', 'Next.js', 'open source'],
  authors: [{ name: 'Letar' }],
  alternates: {
    canonical: 'https://letar.best',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: 'Letar',
    description: 'Экосистема проектов и приложений',
    url: 'https://letar.best',
    siteName: 'Letar',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Letar',
    description: 'Экосистема проектов и приложений',
  },
  icons: {
    icon: '/icon.svg',
  },
}

/** JSON-LD структурированные данные — статический объект, безопасно */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Letar',
  description: 'Экосистема проектов и приложений',
  url: 'https://letar.best',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#319795',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        {/* JSON-LD для SEO — статические данные, XSS невозможен */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Provider>{children}</Provider>
        <AnalyticsConsent />
        <CookieBanner appKey="letar-landing" consentApiUrl={null} />
      </body>
    </html>
  )
}
