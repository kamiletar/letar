'use client'

import { system } from '@/theme'
import { DarkOnlyChakraProvider } from '@letar/chakra-provider/next'
import type { PropsWithChildren } from 'react'

/** Главный провайдер synth — Chakra UI + принудительная тёмная тема (пустота Малевича) */
export function Provider({ children }: PropsWithChildren) {
  return <DarkOnlyChakraProvider value={system}>{children}</DarkOnlyChakraProvider>
}
