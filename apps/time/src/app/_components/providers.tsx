'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import type { PropsWithChildren } from 'react'

import { system } from '@/theme'

/**
 * Клиентский провайдер для Chakra UI + Color Mode.
 * Обёрнут в 'use client' чтобы избежать SSR проблем с ark-ui.
 */
export function ChakraProviders({ children }: PropsWithChildren) {
  return (
    <ColorModeProvider>
      <RootChakraProvider value={system}>{children}</RootChakraProvider>
    </ColorModeProvider>
  )
}
