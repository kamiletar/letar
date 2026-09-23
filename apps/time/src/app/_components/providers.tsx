'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { EmotionRegistry } from '@letar/chakra-provider/next'
import type { PropsWithChildren } from 'react'

import { system } from '@/theme'

/**
 * Клиентский провайдер для Chakra UI + Color Mode.
 * Обёрнут в 'use client' чтобы избежать SSR проблем с ark-ui.
 */
export function ChakraProviders({ children }: PropsWithChildren) {
  return (
    <EmotionRegistry>
      <ColorModeProvider>
        <RootChakraProvider value={system}>{children}</RootChakraProvider>
      </ColorModeProvider>
    </EmotionRegistry>
  )
}
