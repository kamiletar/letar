'use client'

import type { ChakraProviderProps } from '@chakra-ui/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { ThemeProvider, type ThemeProviderProps } from 'next-themes'
import type { ReactNode } from 'react'

export interface RootChakraProviderProps {
  children: ReactNode
}

type ValueProp = Partial<Pick<ChakraProviderProps, 'value'>>

export function RootChakraProvider({ children, value }: RootChakraProviderProps & ValueProp) {
  return <ChakraProvider value={value || defaultSystem}>{children}</ChakraProvider>
}

export interface ColorModeProviderProps extends ThemeProviderProps {
  children: ReactNode
}

/**
 * ColorModeProvider - обёртка над next-themes для управления цветовыми режимами.
 * По умолчанию: системная тема, с возможностью выбора light/dark/system.
 */
export function ColorModeProvider({ children, ...props }: ColorModeProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props}>
      {children}
    </ThemeProvider>
  )
}

export default RootChakraProvider
