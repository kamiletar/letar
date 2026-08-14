'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { QuerySettingsProvider } from '@zenstackhq/tanstack-query/react'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { createQueryClient, type QueryClientConfig } from './create-query-client'

// См. persist-provider.tsx: статический импорт devtools тянет transitively solid-js
// (@tanstack/devtools-ui) в прод-бандл даже когда рантайм-флаг их не рендерит.
const DevtoolsPanel = dynamic(() => import('./devtools-panel').then((m) => m.DevtoolsPanel), { ssr: false })

export interface ZenStackQueryProviderProps extends QueryClientConfig {
  children: ReactNode
  /** API endpoint для ZenStack (по умолчанию '/api/model') */
  endpoint?: string
  /** Показывать TanStack Devtools (по умолчанию в development) */
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
