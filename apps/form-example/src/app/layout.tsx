import { Providers } from '@/components/providers'
import { UmamiScript } from '@letar/analytics'
import type { Metadata } from 'next'

const PRODUCTION_URL = 'https://forms-example.letar.best'

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_URL),
  title: '@letar/forms — Examples',
  description: 'Live examples for @letar/forms library',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <UmamiScript />
      </body>
    </html>
  )
}
