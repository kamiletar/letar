import { ExportQueuePanel } from '@/components/export-queue'
import { GlobalVideoProvider } from '@/components/global-video'
import { AppShell } from '@/components/layout/AppShell'
import { MiniPlayer } from '@/components/mini-player'
import { MobileProgressSync } from '@/components/mobile-progress-sync/MobileProgressSync'
import { SetupWizardOverlay } from '@/components/setup/SetupWizardOverlay'
import { TrackerSyncListener } from '@/components/tracker-sync/TrackerSyncListener'
import { ImportQueueProcessor } from '@/components/transcode'
import { Provider } from '@/components/ui/provider'
import { Toaster } from '@/components/ui/toaster'
import { UpdateDrawer, UpdateProgressIndicator } from '@/components/update'
import { UpdateNotificationManager } from '@/components/update/UpdateNotificationManager'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Animatrona',
  description: 'Медиаплеер и транскодер для аниме',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={inter.variable}>
      <body className={inter.className}>
        {/* SubtitlesOctopus для ASS субтитров */}
        <Script src="/subtitles-octopus.js" strategy="beforeInteractive" />
        <Provider>
          {/* Координатор обработки очереди — живёт всегда, не зависит от навигации */}
          <ImportQueueProcessor />
          {/* Синхронизация прогресса просмотра с мобильного устройства */}
          <MobileProgressSync />
          {/* Инвалидация кеша при фоновой синхронизации с трекером */}
          <TrackerSyncListener />
          {/* Setup wizard при первом запуске — выбор папки библиотеки */}
          <SetupWizardOverlay />
          {/* Менеджер уведомлений об обновлениях */}
          <UpdateNotificationManager />
          {/* Глобальный индикатор прогресса загрузки */}
          <UpdateProgressIndicator />
          {/* Drawer с деталями обновления */}
          <UpdateDrawer />
          {/* Persistent видеоплеер — video+Shaka живут в layout, не уничтожаются */}
          <GlobalVideoProvider>
            <AppShell>{children}</AppShell>
            {/* Панель очереди экспорта — фиксирована внизу экрана */}
            <ExportQueuePanel />
            {/* Глобальный mini-player при навигации со страницы просмотра */}
            <MiniPlayer />
          </GlobalVideoProvider>
          <Toaster />
        </Provider>
      </body>
    </html>
  )
}
