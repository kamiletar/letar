'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { FormI18nProvider } from '@letar/forms'
import type { ReactNode } from 'react'

import { system } from '../_theme/system'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <RootChakraProvider value={system}>
      <ColorModeProvider>
        <FormI18nProvider locale="ru">{children}</FormI18nProvider>
      </ColorModeProvider>
    </RootChakraProvider>
  )
}
