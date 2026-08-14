'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { createQueryClient, type QueryClientConfig } from './create-query-client'

// См. persist-provider.tsx: статический импорт devtools тянет transitively solid-js
// (@tanstack/devtools-ui) в прод-бандл даже когда рантайм-флаг их не рендерит.
const DevtoolsPanel = dynamic(() => import('./devtools-panel').then((m) => m.DevtoolsPanel), { ssr: false })

export interface QueryProviderProps extends QueryClientConfig {
  children: ReactNode
  /**
   * Показывать ли TanStack DevTools (Query + Form)
   * @default true в development, false в production
   */
  showDevtools?: boolean
}

/**
 * Базовый QueryProvider для TanStack Query
 *
 * Предоставляет QueryClient с настраиваемыми пресетами кэширования.
 * Включает TanStack DevTools с поддержкой Query и Form devtools.
 * Для PWA приложений с оффлайн поддержкой используйте PersistQueryProvider.
 *
 * @example
 * ```tsx
 * // Стандартное использование
 * <QueryProvider>
 *   <App />
 * </QueryProvider>
 *
 * // С пресетом для realtime данных
 * <QueryProvider preset="realtime">
 *   <Dashboard />
 * </QueryProvider>
 *
 * // С кастомными настройками
 * <QueryProvider
 *   preset="standard"
 *   defaultOptions={{
 *     queries: { staleTime: 10000 }
 *   }}
 * >
 *   <App />
 * </QueryProvider>
 * ```
 */
export function QueryProvider({ children, showDevtools, ...config }: QueryProviderProps) {
  const queryClient = createQueryClient(config)

  const devtoolsEnabled = showDevtools ?? process.env.NODE_ENV === 'development'

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {devtoolsEnabled && <DevtoolsPanel />}
    </QueryClientProvider>
  )
}
