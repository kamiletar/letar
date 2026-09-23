'use client'

import { system } from '@/lib/theme'
import { DarkOnlyChakraProvider } from '@letar/chakra-provider/next'

interface ProviderProps {
  children: React.ReactNode
}

/** Главный провайдер приложения — Chakra UI + принудительно тёмная тема. */
export function Provider({ children }: ProviderProps) {
  return <DarkOnlyChakraProvider value={system}>{children}</DarkOnlyChakraProvider>
}
