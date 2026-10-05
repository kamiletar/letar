'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { FormI18nProvider } from '@letar/forms'
import type { PropsWithChildren } from 'react'

import { system } from '@/theme'

export function Providers({ children }: PropsWithChildren) {
  return (
    <ColorModeProvider>
      <RootChakraProvider value={system}>
        <FormI18nProvider locale="ru">{children}</FormI18nProvider>
      </RootChakraProvider>
    </ColorModeProvider>
  )
}
