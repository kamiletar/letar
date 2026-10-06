import { UmamiScript } from '@letar/analytics'
import type { Metadata } from 'next'

import { OfflineSync } from './_components/offline-sync'
import { Providers } from './_components/providers'

export const metadata: Metadata = {
  title: 'Блокнот Ками',
  description: 'Заметки с версиями, откатом, офлайн-режимом и публикацией в рубрики сайта',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <OfflineSync />
        </Providers>
        <UmamiScript />
      </body>
    </html>
  )
}
