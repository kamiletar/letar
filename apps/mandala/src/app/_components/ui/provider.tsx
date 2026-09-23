'use client'

import { system } from '@/app/theme'
import { ChakraProvider } from '@chakra-ui/react'
import { ColorModeProvider, type ColorModeProviderProps } from '@letar/chakra-provider'
import { EmotionRegistry } from '@letar/chakra-provider/next'

/**
 * Главный провайдер приложения
 *
 * Включает:
 * - ChakraProvider с кастомной темой из src/theme/
 * - ColorModeProvider для поддержки светлой/тёмной темы
 */
export function Provider(props: ColorModeProviderProps) {
  return (
    <EmotionRegistry>
      <ChakraProvider value={system}>
        <ColorModeProvider {...props} />
      </ChakraProvider>
    </EmotionRegistry>
  )
}
