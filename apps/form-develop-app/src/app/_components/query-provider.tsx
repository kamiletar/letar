'use client'

import { ZenStackQueryProvider } from '@letar/query-provider'
import type { ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

/**
 * QueryProvider для ZenStack v3 + TanStack Query
 *
 * Использует @letar/query-provider с preset="realtime":
 * - staleTime: 5 секунд (для песочницы)
 * - TanStack Devtools (Query + Form) в development
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <ZenStackQueryProvider preset="realtime" endpoint="/api/model">
      {children}
    </ZenStackQueryProvider>
  )
}
