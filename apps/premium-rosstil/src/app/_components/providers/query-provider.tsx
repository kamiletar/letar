'use client'

import { PersistQueryProvider } from '@letar/query-provider'
import type { ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

/**
 * QueryProvider с оффлайн поддержкой через IndexedDB
 *
 * Использует @letar/query-provider с preset="offline":
 * - networkMode: offlineFirst
 * - Кэш в IndexedDB на 24 часа
 * - Инвалидация при деплое через BUILD_ID
 * - TanStack Devtools (Query + Form) в development
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryProvider preset="offline" buster={process.env.NEXT_PUBLIC_BUILD_ID}>
      {children}
    </PersistQueryProvider>
  )
}
