import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { pressableConfig } from '@letar/ui'

import { semanticColors } from './semanticTokens'
import { colors } from './tokens'

/**
 * Конфигурация темы для time приложения
 */
const timeConfig = defineConfig({
  theme: {
    tokens: {
      colors,
    },
    semanticTokens: {
      colors: semanticColors,
    },
    keyframes: {
      ...pressableConfig.keyframes,
      'confetti-float': {
        '0%': { transform: 'translateY(100vh) rotate(0deg)', opacity: '1' },
        '70%': { opacity: '1' },
        '100%': { transform: 'translateY(-20vh) rotate(720deg)', opacity: '0' },
      },
      'celebration-pulse': {
        '0%, 100%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.05)' },
      },
    },
  },
  globalCss: {
    ...pressableConfig.globalCss,
  },
})

/**
 * Система стилей Chakra UI для time
 */
export const system = createSystem(defaultConfig, timeConfig)

export { timeConfig }
