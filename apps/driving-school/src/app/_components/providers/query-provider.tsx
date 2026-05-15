'use client'

import { ZenStackQueryProvider } from '@letar/query-provider'
import type { ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

/**
 * QueryProvider с интеграцией ZenStack v3
 *
 * Использует @letar/query-provider с preset="standard":
 * - staleTime: 5 минут
 * - retry: 1
 * - TanStack Devtools (Query + Form) в development
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <ZenStackQueryProvider preset="standard" endpoint="/api/model">
      {children}
    </ZenStackQueryProvider>
  )
}
