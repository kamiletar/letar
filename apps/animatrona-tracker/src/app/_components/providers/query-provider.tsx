'use client'

import { QueryProvider as BaseQueryProvider } from '@letar/query-provider'
import type { ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

/**
 * QueryProvider для TanStack Query
 *
 * Использует @letar/query-provider с preset="standard":
 * - staleTime: 5 минут
 * - retry: 2
 * - DevTools включены в development
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return <BaseQueryProvider preset="standard">{children}</BaseQueryProvider>
}
