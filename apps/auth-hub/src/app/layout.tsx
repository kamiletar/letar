import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { FormI18nProvider } from '@letar/forms'
import { CookieBanner } from '@letar/ui'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { UmamiScriptConsent } from './_components/umami-script-consent'

const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
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
