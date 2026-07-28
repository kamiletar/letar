import { Provider } from '@/app/_components/ui/provider'
import { UmamiScript } from '@letar/analytics'
import { AnalyticsGate, CookieBanner } from '@letar/ui'
import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://kamikeythe.letar.best'),
  title: {
    template: '%s | KamiKeyThe',
    default: 'KamiKeyThe — Типографские символы одной клавишей',
  },
  description:
    'Windows-утилита для ввода типографских символов через AltGr. Тире, кавычки, стрелки, математические символы — без переключения раскладок.',
  keywords: [
    'типографика',
    'AltGr',
    'символы',
    'Unicode',
    'клавиатура',
    'Windows',
    'тире',
    'кавычки',
    'typography',
    'keyboard',
    'hotkeys',
  ],
  authors: [{ name: 'Letar' }],
  alternates: {
    canonical: 'https://kamikeythe.letar.best',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: 'KamiKeyThe',
    description: 'Типографские символы одной клавишей',
    url: 'https://kamikeythe.letar.best',
    siteName: 'KamiKeyThe',
    locale: 'ru_RU',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'KamiKeyThe — типографская утилита для Windows',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KamiKeyThe',
    description: 'Типографские символы одной клавишей',
    images: ['/og-image.png'],
  },
}

/** JSON-LD структурированные данные для SoftwareApplication */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'KamiKeyThe',
  description: 'Windows-утилита для ввода типографских символов через AltGr',
  url: 'https://kamikeythe.letar.best',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Windows',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'RUB',
  },
  featureList: [
    'Типографские символы через AltGr',
    'Визуальный оверлей клавиатуры',
    'Редактор раскладок с drag-and-drop',
    'Unicode-пикер с 11 категориями',
    'Несколько профилей раскладок',
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#39ff14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={jetbrainsMono.variable}>
      <body>
        {/* JSON-LD для SEO — статические данные (не пользовательский ввод), безопасно */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Provider>{children}</Provider>
        <AnalyticsGate appKey="kami-key-the-landing">
          <UmamiScript />
        </AnalyticsGate>
        <CookieBanner appKey="kami-key-the-landing" consentApiUrl={null} />
      </body>
    </html>
  )
}
