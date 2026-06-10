import { UmamiScript } from '@letar/analytics'
import { CookieBanner, TopLoader } from '@letar/ui'
import type { Metadata } from 'next'

import { Providers } from './_components/providers'
import { ServiceWorkerRegistration } from './_components/service-worker-registration'
import { AppToaster } from './_components/ui/toaster'

const BASE_URL = 'https://grandslamcup.letar.best'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: 'Grand Slam Cup — Турнир поэтов', template: '%s — Grand Slam Cup' },
  description:
    'Первый в России командный поэтический турнир в формате poetry-clash. Живые таблицы, расписание, профили, скоринг.',
  openGraph: {
    siteName: 'Grand Slam Cup',
    type: 'website',
    locale: 'ru_RU',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: '/',
  },
}

/** JSON-LD SportsOrganization — статический объект, безопасно для SSR */
const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SportsOrganization',
  name: 'Grand Slam Cup',
  alternateName: 'Кубок Большого Слэма',
  url: BASE_URL,
  description: 'Первый в России командный поэтический турнир в формате poetry-clash',
  sport: 'Poetry Slam',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </head>
      <body>
        <TopLoader color="#FF0000" />
        <CookieBanner appKey="grandslamcup" privacyUrl="/privacy" />
        <Providers>
          {children}
          <AppToaster />
          <ServiceWorkerRegistration />
        </Providers>
        <UmamiScript />
      </body>
    </html>
  )
}
