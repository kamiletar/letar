import { UmamiScript } from '@letar/analytics'
import type { Metadata, Viewport } from 'next'

import { Provider } from './_components/ui/provider'

const BASE_URL = 'https://synth.letar.best'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Synth — Браузерная студия синтеза',
    template: '%s — Synth',
  },
  description:
    'Персональная браузерная студия для синтеза, исполнения и записи звука. FM + субтрактив + драм. Web Audio / Web MIDI.',
  keywords: ['synthesizer', 'web audio', 'fm synthesis', 'midi', 'open source'],
  authors: [{ name: 'kami' }],
  openGraph: {
    title: 'Synth',
    description: 'Звук становится геометрией и пространством.',
    url: BASE_URL,
    siteName: 'Synth',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Synth',
    description: 'Звук становится геометрией и пространством.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Тёмный фон для тач-баров и мобильных браузеров
  themeColor: '#040302',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head />
      <body>
        <Provider>{children}</Provider>
        <UmamiScript />
      </body>
    </html>
  )
}
