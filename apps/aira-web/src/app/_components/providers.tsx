'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
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
    <ColorModeProvider>
      <RootChakraProvider value={system}>{children}</RootChakraProvider>
    </ColorModeProvider>
  )
}
