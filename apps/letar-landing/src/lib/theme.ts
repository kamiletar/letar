import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

/**
 * Тема для Letar Landing.
 * Графитовая «карта экосистемы» с холодным мятным сигналом.
 */
const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#e6fffa' },
          100: { value: '#b2f5ea' },
          200: { value: '#81e6d9' },
          300: { value: '#4fd1c5' },
          400: { value: '#38b2ac' },
          500: { value: '#319795' },
          600: { value: '#2c7a7b' },
          700: { value: '#285e61' },
          800: { value: '#234e52' },
          900: { value: '#1d4044' },
          a08: { value: 'rgba(101, 230, 210, 0.08)' },
        },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: '#090d0d' },
          subtle: { value: '#101817' },
          muted: { value: '#172220' },
          card: { value: '#0f1817' },
          cardHover: { value: '#13201e' },
          header: { value: 'rgba(9, 13, 13, 0.82)' },
          footer: { value: '#080b0b' },
        },
        fg: {
          DEFAULT: { value: '#f2f8f7' },
          muted: { value: '#9cafac' },
          subtle: { value: '#71817f' },
        },
        border: {
          DEFAULT: { value: '#1d2b29' },
          subtle: { value: '#172220' },
          emphasized: { value: '#2c4440' },
        },
        // ColorPalette для brand
        colorPalette: {
          solid: { value: '{colors.brand.500}' },
          contrast: { value: 'white' },
          fg: { value: '{colors.brand.300}' },
          muted: { value: '{colors.brand.900}' },
          subtle: { value: '{colors.brand.800}' },
          emphasized: { value: '{colors.brand.700}' },
          focusRing: { value: '{colors.brand.500}' },
        },
      },
    },
  },
  globalCss: {
    'html, body': {
      bg: 'bg',
      color: 'fg',
      minHeight: '100dvh',
    },
  },
})

export const system = createSystem(defaultConfig, customConfig)
