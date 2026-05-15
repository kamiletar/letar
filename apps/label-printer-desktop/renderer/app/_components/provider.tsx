'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { QueryProvider } from '@letar/query-provider'
import type { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Провайдеры для Label Printer Desktop
 *
 * QueryProvider из @letar/query-provider с preset="standard".
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider preset="standard">
      <RootChakraProvider>
        <ColorModeProvider>{children}</ColorModeProvider>
      </RootChakraProvider>
    </QueryProvider>
  )
}
