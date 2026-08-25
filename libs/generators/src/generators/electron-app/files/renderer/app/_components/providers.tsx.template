'use client'

import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { FormI18nProvider } from '@letar/forms'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <RootChakraProvider>
      <ColorModeProvider>
        <FormI18nProvider locale="ru">{children}</FormI18nProvider>
      </ColorModeProvider>
    </RootChakraProvider>
  )
}
