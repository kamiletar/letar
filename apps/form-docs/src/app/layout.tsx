import { UmamiScript } from '@letar/analytics'
import 'fumadocs-ui/style.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
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
