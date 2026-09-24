'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { EmotionRegistry } from '@letar/chakra-provider/next'
import type { PropsWithChildren } from 'react'

import { system } from '@/theme'

/**
 * Корневой провайдер приложения.
 *
 * Включает:
 * - Chakra UI с кастомной темой (teal/purple)
 * - Поддержку тёмной/светлой темы
 */
export function Providers({ children }: PropsWithChildren) {
  return (
    <EmotionRegistry>
      <ColorModeProvider>
        <RootChakraProvider value={system}>{children}</RootChakraProvider>
      </ColorModeProvider>
    </EmotionRegistry>
  )
}
