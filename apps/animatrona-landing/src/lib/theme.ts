import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

/**
 * Тема для Animatrona Landing
 * Тёмная тема с фиолетовым акцентом и неоновыми эффектами
 */
const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Фирменный фиолетовый
        brand: {
          50: { value: '#f5f0ff' },
          100: { value: '#ede5ff' },
          200: { value: '#d4c4ff' },
          300: { value: '#b794ff' },
          400: { value: '#9f5fff' },
          500: { value: '#8b3dff' },
          600: { value: '#7c22ff' },
          700: { value: '#6b1ae6' },
          800: { value: '#5a16bf' },
          900: { value: '#4a1299' },
        },
        // Неоновый розовый акцент
        accent: {
          400: { value: '#ff6b9d' },
          500: { value: '#ff4081' },
          600: { value: '#f50057' },
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
          card: { value: 'rgba(30, 30, 46, 0.8)' },
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
          fg: { value: '{colors.brand.400}' },
          muted: { value: '{colors.brand.900}' },
          subtle: { value: '{colors.brand.800}' },
          emphasized: { value: '{colors.brand.700}' },
          focusRing: { value: '{colors.brand.500}' },
        },
      },
    },
    keyframes: {
      // Плавающий эффект
      float: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-10px)' },
      },
      // Свечение
      glow: {
        '0%, 100%': { boxShadow: '0 0 20px rgba(139, 61, 255, 0.3)' },
        '50%': { boxShadow: '0 0 40px rgba(139, 61, 255, 0.6)' },
      },
      // Пульсация границы
      borderPulse: {
        '0%, 100%': { borderColor: 'rgba(139, 61, 255, 0.3)' },
        '50%': { borderColor: 'rgba(139, 61, 255, 0.8)' },
      },
      // Градиент для фона
      gradientShift: {
        '0%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
        '100%': { backgroundPosition: '0% 50%' },
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
              color: 'white',
              _hover: {
                bg: 'brand.600',
                boxShadow: '0 0 30px rgba(139, 61, 255, 0.5)',
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
