'use client'

import { TanStackDevtools } from '@tanstack/react-devtools'
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'

/**
 * Вынесено из persist-provider.tsx: только этот модуль тянет @tanstack/react-devtools и его
 * транзитивные зависимости (solid-js через @tanstack/devtools-ui) — persist-provider.tsx
 * подключает его через next/dynamic({ ssr: false }), поэтому в прод-бандл он не попадает вовсе.
 */
export function DevtoolsPanel() {
  return (
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
  )
}
