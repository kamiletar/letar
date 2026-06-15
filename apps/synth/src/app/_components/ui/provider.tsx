'use client'

import { system } from '@/theme'
import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import type { PropsWithChildren } from 'react'

/** Главный провайдер synth — Chakra UI + принудительная тёмная тема (пустота Малевича) */
export function Provider({ children }: PropsWithChildren) {
  return (
    <ColorModeProvider forcedTheme="dark">
      <RootChakraProvider value={system}>{children}</RootChakraProvider>
    </ColorModeProvider>
  )
}
