'use client'

import type { ChakraProviderProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { ColorModeProvider, RootChakraProvider } from './chakra-provider'
import { EmotionRegistry } from './emotion-registry'

export interface DarkOnlyChakraProviderProps {
  /** Система Chakra приложения (`createSystem(...)`); без неё — `defaultSystem` */
  value?: ChakraProviderProps['value']
  children: ReactNode
}

/**
 * Провайдер приложения с одной, принудительно тёмной темой: лендинги и витрины без светлой темы.
 *
 * Порядок слоёв фиксирован: `EmotionRegistry` снаружи, иначе SSR-стили Emotion уходят инлайн-`<style>`
 * перед элементами, а не в поток, и гидратация плавающе падает с React #418. Системная настройка
 * посетителя тему не меняет (`enableSystem={false}`).
 */
export function DarkOnlyChakraProvider({ value, children }: DarkOnlyChakraProviderProps) {
  return (
    <EmotionRegistry>
      <ColorModeProvider defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
        <RootChakraProvider value={value}>{children}</RootChakraProvider>
      </ColorModeProvider>
    </EmotionRegistry>
  )
}
