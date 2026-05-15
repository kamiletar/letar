'use client'

import { TanStackDevtools } from '@tanstack/react-devtools'
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { QuerySettingsProvider } from '@zenstackhq/tanstack-query/react'
import type { ReactNode } from 'react'
import { createQueryClient, type QueryClientConfig } from './create-query-client'

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
        {devtoolsEnabled && (
          <TanStackDevtools
            plugins={[
              { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel />, defaultOpen: false },
              formDevtoolsPlugin(),
            ]}
          />
        )}
      </QuerySettingsProvider>
    </QueryClientProvider>
  )
}
