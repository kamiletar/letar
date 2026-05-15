'use client'
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { RootChakraProvider } from '@letar/chakra-provider'
import { FormI18nProvider } from '@letar/forms'
import type { PropsWithChildren } from 'react'
import { ColorModeProvider } from './ui/color-mode'

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Кастомная палитра brand для использования с colorPalette="brand"
        // Золотой цвет #CA9E67 - brand color
        brand: {
          '50': { value: '#F9F5EF' }, // Очень светлый
          '100': { value: '#F0E8DA' }, // Светлый
          '200': { value: '#E5D5B8' },
          '300': { value: '#D9C296' },
          '400': { value: '#D1B07F' }, // Светлее основного
          '500': { value: '#CA9E67' }, // Основной цвет (brand)
          '600': { value: '#B88B53' }, // Темнее основного
          '700': { value: '#9A7344' },
          '800': { value: '#7B5C36' }, // Темный
          '900': { value: '#5D4428' }, // Очень темный
          '950': { value: '#3E2D1B' }, // Почти черный
        },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          DEFAULT: {
            value: {
              _light: '{colors.brand.500}',
              _dark: '{colors.brand.500}',
            },
          },
          solid: {
            value: {
              _light: '{colors.brand.500}',
              _dark: '{colors.brand.500}',
            },
          },
          contrast: {
            value: {
              _light: 'white',
              _dark: 'white',
            },
          },
          fg: {
            value: {
              _light: '{colors.brand.500}',
              _dark: '{colors.brand.500}',
            },
          },
          muted: {
            value: {
              _light: '{colors.brand.300}',
              _dark: '{colors.brand.100}',
            },
          },
          subtle: {
            value: {
              _light: '{colors.brand.300}',
              _dark: '{colors.brand.100}',
            },
          },
          emphasized: {
            value: {
              _light: '{colors.brand.700}',
              _dark: '{colors.brand.700}',
            },
          },
          focusRing: {
            value: '{colors.brand.500}',
          },
        },
      },
    },
  },
})

const system = createSystem(defaultConfig, config)

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  return (
    <ColorModeProvider defaultTheme="system">
      <RootChakraProvider value={system}>
        <FormI18nProvider locale="ru">{children}</FormI18nProvider>
      </RootChakraProvider>
    </ColorModeProvider>
  )
}
