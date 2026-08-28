import { Provider } from '@/app/_components/ui/provider'
import { UmamiScript } from '@letar/analytics'
import { AnalyticsGate, CookieBanner } from '@letar/ui'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const signalFont = localFont({
  src: '../assets/fonts/departure-mono.woff2',
  variable: '--font-signal',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://letar.best'),
  title: {
    template: '%s | Letar',
    default: 'Letar — Проекты и приложения',
  },
  description:
    'Живая экосистема сайтов, приложений и инструментов: продукты Ками, работы Studio Letar, open source и инфраструктура.',
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
    description: 'Проекты, которые живут и работают',
    url: 'https://letar.best',
    siteName: 'Letar',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Letar',
    description: 'Проекты, которые живут и работают',
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
  description: 'Живая экосистема сайтов, приложений и инструментов',
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
      <body className={signalFont.variable}>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <Provider>
          {children}
          <CookieBanner appKey="letar-landing" consentApiUrl={null} />
        </Provider>
        <AnalyticsGate appKey="letar-landing">
          <UmamiScript />
        </AnalyticsGate>
      </body>
    </html>
  )
}
