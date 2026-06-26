'use client'

import { system } from '@/theme'
import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'

/** Главный провайдер synth — Chakra UI + принудительная тёмная тема (пустота Малевича) */
export function Provider({ children }: PropsWithChildren) {
  // iOS-фикс: без touchstart-листенера :active не срабатывает
  useEffect(() => {
    document.addEventListener('touchstart', () => undefined, { passive: true })
  }, [])

  return (
    <ColorModeProvider forcedTheme="dark">
      <RootChakraProvider value={system}>{children}</RootChakraProvider>
    </ColorModeProvider>
  )
}
