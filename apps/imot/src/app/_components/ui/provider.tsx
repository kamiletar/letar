'use client'

import { ColorModeProvider } from '@/app/_components/ui/color-mode'
import { ChakraProvider, createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { FormI18nProvider } from '@letar/forms'
import type { ThemeProviderProps } from 'next-themes'

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
        // Золотой цвет бренда (fg)
        fg: {
          50: { value: '#FEFCF7' },
          100: { value: '#FDF8ED' },
          200: { value: '#F9EDD1' },
          300: { value: '#F5E2B5' },
          400: { value: '#DFC691' },
          500: { value: '#CA9E67' }, // Основной золотой
          600: { value: '#B58A54' },
          700: { value: '#997340' },
          800: { value: '#7D5C2D' },
          900: { value: '#66481A' },
        },
      },
    },
  },
})

const system = createSystem(defaultConfig, imotConfig)

export function Provider(props: ThemeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <FormI18nProvider locale="ru">
        <ColorModeProvider {...props} />
      </FormI18nProvider>
    </ChakraProvider>
  )
}
