'use client'

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { createQueryClient, type QueryClientConfig } from './create-query-client'
import { createIDBPersister, type IDBPersisterOptions } from './idb-persister'

// Динамический импорт: devtools рендерятся только при devtoolsEnabled (по умолчанию — только
// в development), но статический import подтягивал их транзитивные зависимости (solid-js через
// @tanstack/devtools-ui) в прод-бандл всегда — компиляция падала при рассинхроне версий solid-js,
// независимо от того, что рантайм-флаг всё равно их не рендерил (driving-school, 2026-08-14).
const DevtoolsPanel = dynamic(() => import('./devtools-panel').then((m) => m.DevtoolsPanel), { ssr: false })

export interface PersistQueryProviderProps extends QueryClientConfig {
  children: ReactNode
  /**
   * Настройки IndexedDB персистера
   */
  persisterOptions?: IDBPersisterOptions
  /**
   * Максимальный возраст кэша в миллисекундах
   * @default 24 часа
   */
  maxAge?: number
  /**
   * Строка для инвалидации кэша (обычно BUILD_ID)
   * При изменении buster весь кэш сбрасывается
   */
  buster?: string
  /**
   * Показывать ли TanStack DevTools (Query + Form)
   * @default true в development, false в production
   */
  showDevtools?: boolean
}

/**
 * QueryProvider с персистенцией в IndexedDB
 *
 * Сохраняет кэш TanStack Query между сессиями браузера,
 * что позволяет PWA приложениям работать оффлайн.
 *
 * @example
 * ```tsx
 * // Базовое использование для PWA
 * <PersistQueryProvider preset="offline">
 *   <App />
 * </PersistQueryProvider>
 *
 * // С кастомным ключом и buster'ом для инвалидации
 * <PersistQueryProvider
 *   preset="offline"
 *   persisterOptions={{ key: 'my-app-cache' }}
 *   buster={process.env.NEXT_PUBLIC_BUILD_ID}
 *   maxAge={7 * 24 * 60 * 60 * 1000} // 7 дней
 * >
 *   <App />
 * </PersistQueryProvider>
 * ```
 */
export function PersistQueryProvider({
  children,
  persisterOptions,
  maxAge = 24 * 60 * 60 * 1000, // 24 часа
  buster,
  showDevtools,
  ...config
}: PersistQueryProviderProps) {
  // Для PWA по умолчанию используем offline пресет
  const queryClient = createQueryClient({
    preset: 'offline',
    ...config,
  })

  const persister = createIDBPersister(persisterOptions)

  const devtoolsEnabled = showDevtools ?? process.env.NODE_ENV === 'development'

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge,
        buster,
      }}
    >
      {children}
      {devtoolsEnabled && <DevtoolsPanel />}
    </PersistQueryClientProvider>
  )
}
