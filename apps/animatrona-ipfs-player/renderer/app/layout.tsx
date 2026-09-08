import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Providers } from './_components/providers'

export const metadata: Metadata = {
  title: 'Animatrona IPFS Player',
  description: 'Лёгкий IPFS-плеер аниме — просмотр раздач по CID, без импорта и кодирования',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
