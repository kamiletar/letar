'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { QuerySettingsProvider } from '@zenstackhq/tanstack-query/react'
import type { ReactNode } from 'react'
import { createQueryClient, type QueryClientConfig } from './create-query-client'
// Панель девтулзов подключается только так — почему `dynamic(ssr:false)` тут не работает,
// написано в самом модуле
import { DevtoolsPanel } from './devtools-panel-lazy'

export interface ZenStackQueryProviderProps extends QueryClientConfig {
  children: ReactNode
  /** API endpoint для ZenStack (по умолчанию '/api/model') */
  endpoint?: string
  /**
   * Показывать TanStack Devtools — работает только в development.
   *
   * В production панели нет в сборке вовсе (см. `devtools-panel-lazy.tsx`), поэтому
   * `showDevtools: true` там ничего не включит. Флаг нужен, чтобы выключить панель в dev.
   */
  showDevtools?: boolean
}

/**
 * QueryProvider с интеграцией ZenStack v3
 *
 * Объединяет:
 * - TanStack Query с настраиваемыми пресетами кэширования
 * - ZenStack QuerySettingsProvider для API хуков
 * - TanStack Devtools (Query + Form) в development
 *
 * @example
 * ```tsx
 * <ZenStackQueryProvider preset="standard" endpoint="/api/model">
 *   <App />
 * </ZenStackQueryProvider>
 * ```
 */
export function ZenStackQueryProvider({
  children,
  endpoint = '/api/model',
  showDevtools,
  ...config
}: ZenStackQueryProviderProps) {
  const queryClient = createQueryClient(config)
  const devtoolsEnabled = showDevtools ?? process.env.NODE_ENV === 'development'

  return (
    <QueryClientProvider client={queryClient}>
      <QuerySettingsProvider value={{ endpoint }}>
        {children}
        {devtoolsEnabled && <DevtoolsPanel />}
      </QuerySettingsProvider>
    </QueryClientProvider>
  )
}
