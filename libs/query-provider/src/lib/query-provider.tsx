'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createQueryClient, type QueryClientConfig } from './create-query-client'
// Панель девтулзов подключается только так — почему `dynamic(ssr:false)` тут не работает,
// написано в самом модуле
import { DevtoolsPanel } from './devtools-panel-lazy'

export interface QueryProviderProps extends QueryClientConfig {
  children: ReactNode
  /**
   * Показывать ли TanStack DevTools (Query + Form) — работает только в development.
   *
   * В production панели нет в сборке вовсе (см. `devtools-panel-lazy.tsx`), поэтому
   * `showDevtools: true` там ничего не включит. Флаг нужен, чтобы выключить панель в dev.
   *
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
