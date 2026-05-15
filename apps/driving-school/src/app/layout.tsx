import { AuthFlagSetter } from '@/app/_components/auth-flag-setter'
import { BottomNavWrapper } from '@/app/_components/bottom-nav-wrapper'
import { CommandPalette } from '@/app/_components/command-palette'
import { FloatingChatButtonWrapper } from '@/app/_components/floating-chat-button-wrapper'
import { OfflineIndicator } from '@/app/_components/offline-indicator'
import { ServiceWorkerInit } from '@/app/_components/service-worker-init'
import { Provider } from '@/app/_components/ui/provider'
import { Toaster } from '@/app/_components/ui/toaster'
import { UpdateBanner } from '@/app/_components/update-banner'
import { getSession } from '@/lib/auth'
// oxlint-disable-next-line import/no-unassigned-import -- side-effect импорт для русификации Zod
import '@/lib/zod-config'
import { UmamiScript } from '@letar/analytics'
import { TopLoader } from '@letar/ui'
import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
// oxlint-disable-next-line import/no-unassigned-import -- CSS импорт
import './global.css'

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  title: 'НаПрава.РФ — Платформа для управления занятиями',
  description: 'Управление расписанием, бронирование занятий, связь ученик-инструктор',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'НаПрава.РФ',
  },
}

export const viewport: Viewport = {
  themeColor: '#4F6EF7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const isAuthenticated = !!session?.user

  return (
    <html lang="ru" suppressHydrationWarning className={nunito.variable}>
      <body className={nunito.className}>
        <Provider>
          <TopLoader />
          <UmamiScript />
          {children}
          <BottomNavWrapper />
          <FloatingChatButtonWrapper />
          <CommandPalette />
          <Toaster />
          <OfflineIndicator />
          <UpdateBanner />
          <AuthFlagSetter isAuthenticated={isAuthenticated} />
          <ServiceWorkerInit />
        </Provider>
      </body>
    </html>
  )
}
