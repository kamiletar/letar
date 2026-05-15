import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

import { semanticColors } from './semanticTokens'
import { colors } from './tokens'

/**
 * Конфигурация темы для aira-web
 *
 * Включает:
 * - Кастомные цветовые палитры (brand: teal, accent: purple)
 * - Полную поддержку Dark Mode через semantic tokens
 * - Анимации для героя и декоративных элементов
 */
const airaConfig = defineConfig({
  theme: {
    tokens: {
      colors,
    },
    semanticTokens: {
      colors: semanticColors,
    },
    keyframes: {
      gradientShift: {
        '0%, 100%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
      },
      float: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-10px)' },
      },
      pulse: {
        '0%, 100%': { opacity: '0.4' },
        '50%': { opacity: '0.8' },
      },
    },
  },
  globalCss: {
    body: {
      bg: 'bg',
      color: 'fg',
    },
  },
})

/**
 * Система стилей Chakra UI для aira-web
 */
export const system = createSystem(defaultConfig, airaConfig)

export { airaConfig }
