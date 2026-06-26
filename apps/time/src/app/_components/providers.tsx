'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'

import { system } from '@/theme'

/**
 * Клиентский провайдер для Chakra UI + Color Mode.
 * Обёрнут в 'use client' чтобы избежать SSR проблем с ark-ui.
 */
export function ChakraProviders({ children }: PropsWithChildren) {
  // iOS-фикс: без touchstart-листенера :active не срабатывает
  useEffect(() => {
    document.addEventListener('touchstart', () => undefined, { passive: true })
  }, [])

  return (
    <ColorModeProvider>
      <RootChakraProvider value={system}>{children}</RootChakraProvider>
    </ColorModeProvider>
  )
}
