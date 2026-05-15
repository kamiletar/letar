import { ErrorBoundary } from '@/app/_components/ErrorBoundary'
import { DashboardPageWrapper } from '@/app/_components/layout/DashboardPageWrapper'
import { Sidebar } from '@/app/_components/layout/Sidebar'
import { MonitoringAutoStart } from '@/app/_components/MonitoringAutoStart'
import { QueryProvider } from '@/app/_components/query-provider'
import { ServerProvider } from '@/app/_components/server-provider'
import { SessionProvider } from '@/app/_components/session-provider'
import { ThemeProvider } from '@/app/_components/theme-provider'
import { Toaster } from '@/app/_components/ui/toaster'
import { UmamiScript } from '@letar/analytics'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Dashboard - Система управления',
  description: 'Мониторинг и управление продакшен серверами v3',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#CA9E67',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.className} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ErrorBoundary>
            <SessionProvider>
              <QueryProvider>
                <ServerProvider>
                  <Toaster />
                  <UmamiScript />
                  <MonitoringAutoStart />
                  <Sidebar />
                  <DashboardPageWrapper>{children}</DashboardPageWrapper>
                </ServerProvider>
              </QueryProvider>
            </SessionProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
