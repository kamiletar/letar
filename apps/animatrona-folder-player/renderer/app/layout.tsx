import type { Metadata } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { Providers } from './_components/providers'

export const metadata: Metadata = {
  title: 'Animatrona Player',
  description: 'Плеер аниме из папки — без импорта, IPFS и транскодирования',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        {/* SubtitlesOctopus (libass-wasm) — рендер ASS/SSA субтитров, см. SubtitleOverlay */}
        <Script src="/subtitles-octopus.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
