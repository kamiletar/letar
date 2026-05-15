'use client'

import { system } from '@/lib/theme'
import { ChakraProvider } from '@chakra-ui/react'
import { ThemeProvider } from 'next-themes'

interface ProviderProps {
  children: React.ReactNode
}

/**
 * Главный провайдер приложения
 * Обёртка с 'use client' для правильной инициализации Chakra UI
 */
export function Provider({ children }: ProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" disableTransitionOnChange>
      <ChakraProvider value={system}>{children}</ChakraProvider>
    </ThemeProvider>
  )
}
