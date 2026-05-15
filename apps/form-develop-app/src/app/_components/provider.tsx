'use client'

import { RootChakraProvider } from '@letar/chakra-provider'
import { FormI18nProvider } from '@letar/forms'
import type { ReactNode } from 'react'
import { QueryProvider } from './query-provider'

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootChakraProvider>
      <FormI18nProvider locale="ru">
        <QueryProvider>{children}</QueryProvider>
      </FormI18nProvider>
    </RootChakraProvider>
  )
}
