'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import type { PropsWithChildren } from 'react'

import { system } from '@/theme'

/**
 * Корневой провайдер приложения НейроАбоИ.
 *
 * Включает:
 * - Chakra UI с кастомной темой (терракот + фиолетовый)
 * - Поддержку светлой/тёмной темы
 */
export function Providers({ children }: PropsWithChildren) {
  return (
    <ColorModeProvider>
      <RootChakraProvider value={system}>{children}</RootChakraProvider>
    </ColorModeProvider>
  )
}
