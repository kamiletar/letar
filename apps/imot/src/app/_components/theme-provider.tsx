'use client'

import { ChakraProvider, createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { type ReactNode } from 'react'
// Создаем систему с кастомной темой для IMOT
const imotConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Цветовая палитра IMOT
        purple: {
          50: { value: '#F5F3FF' },
          100: { value: '#EDE9FE' },
          200: { value: '#DDD6FE' },
          300: { value: '#C4B5FD' },
          400: { value: '#A78BFA' },
          500: { value: '#667eea' }, // Основной цвет IMOT
          600: { value: '#764ba2' },
          700: { value: '#6D28D9' },
          800: { value: '#5B21B6' },
          900: { value: '#4C1D95' },
        },
      },
    },
  },
})

const system = createSystem(defaultConfig, imotConfig)

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * Theme Provider для IMOT приложения
 * Оборачивает приложение в ChakraProvider с кастомной темой
 */
export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  return <ChakraProvider value={system}>{children}</ChakraProvider>
}
