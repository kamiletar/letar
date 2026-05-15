import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

/**
 * Тема для KamiKeyThe Landing
 * Тёмная тема с зелёным неоновым акцентом — хакерский/терминальный вайб
 */
const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Зелёный неон
        brand: {
          50: { value: '#eafff0' },
          100: { value: '#c6ffd6' },
          200: { value: '#8bffaa' },
          300: { value: '#4dff7a' },
          400: { value: '#39ff14' },
          500: { value: '#00e600' },
          600: { value: '#00b300' },
          700: { value: '#008a00' },
          800: { value: '#006600' },
          900: { value: '#004400' },
        },
        // Циановый акцент
        accent: {
          400: { value: '#22d3ee' },
          500: { value: '#06b6d4' },
          600: { value: '#0891b2' },
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
          card: { value: 'rgba(10, 20, 15, 0.8)' },
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
          contrast: { value: 'black' },
          fg: { value: '{colors.brand.400}' },
          muted: { value: '{colors.brand.900}' },
          subtle: { value: '{colors.brand.800}' },
          emphasized: { value: '{colors.brand.700}' },
          focusRing: { value: '{colors.brand.400}' },
        },
      },
    },
    keyframes: {
      // Плавающий эффект
      float: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-10px)' },
      },
      // Зелёное свечение
      glow: {
        '0%, 100%': { boxShadow: '0 0 20px rgba(57, 255, 20, 0.3)' },
        '50%': { boxShadow: '0 0 40px rgba(57, 255, 20, 0.6)' },
      },
      // Пульсация границы
      borderPulse: {
        '0%, 100%': { borderColor: 'rgba(57, 255, 20, 0.3)' },
        '50%': { borderColor: 'rgba(57, 255, 20, 0.8)' },
      },
      // Градиент для фона
      gradientShift: {
        '0%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
        '100%': { backgroundPosition: '0% 50%' },
      },
      // Мигание терминального курсора
      cursorBlink: {
        '0%, 100%': { opacity: '1' },
        '50%': { opacity: '0' },
      },
    },
    recipes: {
      // Кнопка с glow эффектом
      button: {
        base: {
          transition: 'all 0.2s ease-out',
          _active: { transform: 'scale(0.98)' },
        },
        variants: {
          variant: {
            glow: {
              bg: 'brand.500',
              color: 'black',
              fontWeight: 'bold',
              _hover: {
                bg: 'brand.400',
                boxShadow: '0 0 30px rgba(57, 255, 20, 0.5)',
              },
            },
          },
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
