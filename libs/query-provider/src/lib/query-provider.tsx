'use client'

import { TanStackDevtools } from '@tanstack/react-devtools'
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'
import { createQueryClient, type QueryClientConfig } from './create-query-client'

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
      {devtoolsEnabled && (
        <TanStackDevtools
          plugins={[
            {
              name: 'TanStack Query',
              render: <ReactQueryDevtoolsPanel />,
              defaultOpen: false,
            },
            formDevtoolsPlugin(),
          ]}
        />
      )}
    </QueryClientProvider>
  )
}
