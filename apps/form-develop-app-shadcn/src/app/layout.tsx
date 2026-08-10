import { UmamiScript } from '@letar/analytics'
import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Form Develop App (shadcn)',
  description: 'Песочница для разработки @letar/forms-shadcn',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        {children}
        <UmamiScript />
      </body>
    </html>
  )
}
