'use client'

import { system } from '@/app/theme'
import { ChakraProvider } from '@chakra-ui/react'
import { ColorModeProvider, type ColorModeProviderProps, useIosActiveFix } from '@letar/chakra-provider'
import { EmotionRegistry } from '@letar/chakra-provider/next'

/**
 * Главный провайдер приложения
 *
 * Включает:
 * - ChakraProvider с кастомной темой из src/theme/
 * - ColorModeProvider для поддержки светлой/тёмной темы
 */
export function Provider(props: ColorModeProviderProps) {
  // iOS: без touchstart-листенера :active не срабатывает (голый ChakraProvider, фикс — явно)
  useIosActiveFix()

  return (
    <EmotionRegistry>
      <ChakraProvider value={system}>
        <ColorModeProvider {...props} />
      </ChakraProvider>
    </EmotionRegistry>
  )
}
