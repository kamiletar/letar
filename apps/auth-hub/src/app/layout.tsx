import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { FormI18nProvider } from '@letar/forms'
import { CookieBanner } from '@letar/ui'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { UmamiScriptConsent } from './_components/umami-script-consent'

// Шрифт лежит файлом, а не тянется `next/font/google` — см. src/app/fonts/README.md
const inter = localFont({
  src: './fonts/Inter-cyrillic-latin.woff2',
  weight: '400 700',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://auth.letar.best'),
  title: {
    default: 'Letar Auth — Ключница',
    template: '%s | Letar Auth',
  },
  description: 'Единый центр авторизации для сервисов Letar',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <body>
        <RootChakraProvider>
          <ColorModeProvider>
            <FormI18nProvider locale="ru">
              {children}
              <CookieBanner appKey="auth-hub" />
              <UmamiScriptConsent />
            </FormI18nProvider>
          </ColorModeProvider>
        </RootChakraProvider>
      </body>
    </html>
  )
}
