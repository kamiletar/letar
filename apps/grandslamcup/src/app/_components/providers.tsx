'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { QueryProvider } from '@letar/query-provider'
import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'

import { system } from '@/theme'

export function Providers({ children }: PropsWithChildren) {
  // iOS-фикс: без touchstart-листенера :active не срабатывает
  useEffect(() => {
    document.addEventListener('touchstart', () => undefined, { passive: true })
  }, [])

  return (
    <QueryProvider preset="standard">
      <ColorModeProvider>
        <RootChakraProvider value={system}>{children}</RootChakraProvider>
      </ColorModeProvider>
    </QueryProvider>
  )
}
