import { Header } from '@/app/_components/header/header'
import { IOSInstallPrompt } from '@/app/_components/ios-install-prompt'
import { SessionProvider } from '@/app/_components/session-provider'
import { SessionUpdater } from '@/app/_components/session-updater'
import { ThemeProvider } from '@/app/_components/theme-provider'
import { routing } from '@/i18n/routing'
import { getSession } from '@/lib/auth'
import { UmamiScript } from '@letar/analytics'
import { ColorModeProvider } from '@letar/chakra-provider'
import { TopLoader } from '@letar/ui'
import { YandexMetrika } from '@letar/yandex-metrika'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { Cormorant_Garamond, Tenor_Sans } from 'next/font/google'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { CompareBar } from '../_components/compare-bar'
import { Footer } from '../_components/footer/footer'
import { OnlineStatus } from '../_components/online-status'
import { OrganizationJsonLd } from '../_components/organization-json-ld'
import { QueryProvider } from '../_components/providers/query-provider'
import { SyncStatus } from '../_components/sync-status'
import { Toaster } from '../_components/ui/toaster'

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['cyrillic'],
  weight: '300',
})
const tenorSans = Tenor_Sans({
  subsets: ['cyrillic'],
  weight: '400',
})

const YM_COUNTER_ID = process.env.NEXT_PUBLIC_YM_COUNTER_ID

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // Проверяем валидность локали
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const session = await getSession()

  return (
    <html lang={locale} prefix="og: http://ogp.me/ns#" className={tenorSans.className} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <OrganizationJsonLd />
      </head>
      <body>
        <ColorModeProvider>
          <ThemeProvider fonts={{ headings: cormorantGaramond, text: tenorSans }}>
            <NextIntlClientProvider>
              <SessionProvider session={session}>
                <SessionUpdater />
                <QueryProvider>
                  <TopLoader />
                  <Toaster />
                  <YandexMetrika YM_COUNTER_ID={Number(YM_COUNTER_ID)} />
                  <UmamiScript />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <Header />
                    {children}
                    <Footer />
                  </div>
                  <IOSInstallPrompt />
                  <OnlineStatus />
                  <SyncStatus />
                  <CompareBar />
                </QueryProvider>
              </SessionProvider>
            </NextIntlClientProvider>
          </ThemeProvider>
        </ColorModeProvider>
      </body>
    </html>
  )
}

// Генерируем статические параметры для всех локалей
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
