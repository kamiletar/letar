'use client'
import { themeConfig } from '@/theme/config'
import { createSystem, defaultConfig } from '@chakra-ui/react'
import { ColorModeProvider, RootChakraProvider } from '@letar/chakra-provider'
import { FormI18nProvider } from '@letar/forms'
import type { PropsWithChildren } from 'react'

const system = createSystem(defaultConfig, themeConfig)

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  return (
    <ColorModeProvider defaultTheme="system">
      <RootChakraProvider value={system}>
        <FormI18nProvider locale="ru">{children}</FormI18nProvider>
      </RootChakraProvider>
    </ColorModeProvider>
  )
}
