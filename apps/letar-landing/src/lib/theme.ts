import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

/**
 * Тема для Letar Landing
 * Тёмная тема с teal/cyan акцентом
 */
const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Фирменный teal
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
        },
      },
    },
    semanticTokens: {
      colors: {
        // Фон — всегда тёмный
        bg: {
          DEFAULT: { value: '{colors.gray.950}' },
          subtle: { value: '{colors.gray.900}' },
          muted: { value: '{colors.gray.800}' },
          card: { value: 'rgba(20, 30, 35, 0.8)' },
        },
        // Текст — светлый
        fg: {
          DEFAULT: { value: '{colors.gray.50}' },
          muted: { value: '{colors.gray.400}' },
          subtle: { value: '{colors.gray.500}' },
        },
        // Границы
        border: {
          DEFAULT: { value: '{colors.gray.800}' },
          subtle: { value: '{colors.gray.700}' },
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
      bg: 'gray.950',
      color: 'gray.50',
      minHeight: '100dvh',
    },
  },
})

export const system = createSystem(defaultConfig, customConfig)
