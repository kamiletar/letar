import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#ecfdf5' },
          100: { value: '#d1fae5' },
          200: { value: '#a7f3d0' },
          300: { value: '#6ee7b7' },
          400: { value: '#34d399' },
          500: { value: '#10b981' },
          600: { value: '#059669' },
          700: { value: '#047857' },
          800: { value: '#065f46' },
          900: { value: '#064e3b' },
        },
      },
    },
    semanticTokens: {
      colors: {
        'brand.solid': { value: { _light: '{colors.brand.600}', _dark: '{colors.brand.400}' } },
        'brand.contrast': { value: { _light: 'white', _dark: '{colors.brand.950}' } },
        'brand.fg': { value: { _light: '{colors.brand.700}', _dark: '{colors.brand.300}' } },
        'brand.muted': { value: { _light: '{colors.brand.100}', _dark: '{colors.brand.900}' } },
        'brand.subtle': { value: { _light: '{colors.brand.50}', _dark: '{colors.brand.950}' } },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
