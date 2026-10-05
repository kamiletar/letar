import { UmamiScript } from '@letar/analytics'
import type { Metadata } from 'next'

import { Providers } from './_components/providers'

export const metadata: Metadata = {
  title: 'Блокнот Ками',
  description: 'Заметки с версиями, откатом, офлайн-режимом и публикацией в рубрики сайта',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <UmamiScript />
      </body>
    </html>
  )
}
