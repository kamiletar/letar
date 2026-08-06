import { UmamiScript } from '@letar/analytics'
import 'fumadocs-ui/style.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

const PRODUCTION_URL = 'https://forms.letar.best'

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_URL),
  title: {
    template: '%s | @letar/forms',
    default: '@letar/forms — Declarative Form Components for React',
  },
  description:
    '40+ declarative form field components for React, powered by TanStack Form and Chakra UI v3. Schema-driven validation with Zod.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        {children}
        <UmamiScript />
      </body>
    </html>
  )
}
