'use client'

import { system } from '@/lib/theme'
import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { EmotionRegistry } from '@letar/chakra-provider/next'

interface ProviderProps {
  children: React.ReactNode
}

/**
 * Главный провайдер приложения — Chakra UI + тёмная тема.
 *
 * `EmotionRegistry` снаружи: SSR-стили Emotion уходят в поток, а не инлайн-`<style>` перед
 * элементами (иначе плавающая ошибка гидратации React #418).
 */
export function Provider({ children }: ProviderProps) {
  return (
    <EmotionRegistry>
      <ColorModeProvider defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
        <RootChakraProvider value={system}>{children}</RootChakraProvider>
      </ColorModeProvider>
    </EmotionRegistry>
  )
}
