import { Providers } from '@/components/providers'
import { UmamiScript } from '@letar/analytics'
import type { Metadata } from 'next'

export const metadata: Metadata = {
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
