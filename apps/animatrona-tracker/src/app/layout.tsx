import { UmamiScript } from '@letar/analytics'
import Script from 'next/script'

import { Header } from '@/app/_components/header'
import { QueryProvider } from '@/app/_components/providers/query-provider'
import { Provider } from '@/app/_components/ui/provider'
import { Toaster } from '@/app/_components/ui/toaster'
import type { Metadata } from 'next'
// oxlint-disable-next-line no-unassigned-import

export const metadata: Metadata = {
  title: {
    default: 'Animatrona Tracker',
    template: '%s | Animatrona',
  },
  description: 'Платформа для просмотра и поиска IPFS контента',
  keywords: ['ipfs', 'video', 'anime', 'tracker', 'decentralized'],
  authors: [{ name: 'Animatrona Team' }],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Animatrona Tracker',
  },
  alternates: {
    types: {
      'application/rss+xml': [{ url: '/api/rss/feed.xml', title: 'Animatrona Tracker — Новые релизы' }],
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Provider>
          <QueryProvider>
            <Header />
            {children}
            <Toaster />
          </QueryProvider>
        </Provider>
        <Script src="/subtitles-octopus.js" strategy="beforeInteractive" />
        <UmamiScript />
      </body>
    </html>
  )
}
