import { SkipLink } from '@/app/_components/skip-link'
import { Provider } from '@/app/_components/ui/provider'
import { UmamiScript } from '@letar/analytics'
import { AnalyticsGate, CookieBanner } from '@letar/ui'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://animatrona.letar.best'),
  title: {
    template: '%s | Animatrona',
    default: 'Animatrona — Умная библиотека аниме с GPU-транскодированием',
  },
  description:
    'Desktop приложение для управления аниме-коллекцией. GPU-ускоренное кодирование AV1/HEVC, автоматический подбор качества VMAF, импорт метаданных с Shikimori.',
  keywords: [
    'аниме',
    'транскодирование',
    'AV1',
    'HEVC',
    'NVENC',
    'библиотека',
    'Shikimori',
    'anime',
    'video',
    'encoder',
  ],
  authors: [{ name: 'Letar' }],
  alternates: {
    canonical: 'https://animatrona.letar.best',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: 'Animatrona',
    description: 'Умная библиотека аниме с GPU-транскодированием',
    url: 'https://animatrona.letar.best',
    siteName: 'Animatrona',
    locale: 'ru_RU',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Animatrona — Desktop приложение для аниме',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Animatrona',
    description: 'Умная библиотека аниме с GPU-транскодированием',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

/** JSON-LD структурированные данные для SoftwareApplication */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Animatrona',
  description: 'Умная библиотека аниме с GPU-транскодированием',
  url: 'https://animatrona.letar.best',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Windows, macOS, Linux',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'RUB',
  },
  downloadUrl: 'https://github.com/kamiletar/letar/releases',
  featureList: [
    'GPU-ускоренное кодирование AV1/HEVC',
    'Автоматический подбор качества VMAF',
    'Импорт метаданных с Shikimori',
    'Поддержка ASS субтитров',
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#8b3dff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        {/* JSON-LD для SEO — статические данные, безопасно */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <SkipLink />
        <Provider>{children}</Provider>
        <AnalyticsGate appKey="animatrona-landing">
          <UmamiScript />
        </AnalyticsGate>
        <CookieBanner appKey="animatrona-landing" consentApiUrl={null} />
      </body>
    </html>
  )
}
