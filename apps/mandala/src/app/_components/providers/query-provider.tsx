'use client'

import { PersistQueryProvider } from '@letar/query-provider'
import type { ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

/**
 * QueryProvider с IndexedDB персистентностью для PWA
 *
 * - Сохраняет кэш между сессиями в IndexedDB
 * - Использует preset='offline' (networkMode: 'offlineFirst')
 * - Данные доступны оффлайн
 * - gcTime: 24 часа, maxAge: 24 часа
 * - Buster инвалидирует кэш при изменении BUILD_ID
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryProvider
      preset="offline"
      persisterOptions={{ key: 'MANDALA_QUERY_CACHE' }}
      maxAge={24 * 60 * 60 * 1000} // 24 часа
      buster={process.env.NEXT_PUBLIC_BUILD_ID}
    >
      {children}
    </PersistQueryProvider>
  )
}
