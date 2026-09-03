import { CookieBanner, OfflineConsentBanner, ServiceWorkerRegistration, TopLoader } from '@letar/ui'
import type { Metadata } from 'next'

import { Providers } from './_components/providers'
import { AppToaster } from './_components/ui/toaster'
import { UmamiScriptConsent } from './_components/umami-script-consent'

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
        <Providers>
          <CookieBanner appKey="grandslamcup" privacyUrl="/privacy" />
          {children}
          <AppToaster />
          <ServiceWorkerRegistration consentKey="grandslamcup-offline-consent" />
          <OfflineConsentBanner
            consentKey="grandslamcup-offline-consent"
            title="Включить оффлайн-доступ?"
            description="Приложение сохранит расписание, таблицы и профили для просмотра без интернета"
            features={['Работает без сети', 'Займёт немного места в хранилище браузера']}
            enableLabel="Включить оффлайн"
          />
        </Providers>
        <UmamiScriptConsent />
      </body>
    </html>
  )
}
