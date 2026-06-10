import { UmamiScript } from '@letar/analytics'
import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { CookieBanner } from '@letar/ui'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

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
            {children}
            <CookieBanner appKey="auth-hub" />
            <UmamiScript />
          </ColorModeProvider>
        </RootChakraProvider>
      </body>
    </html>
  )
}
