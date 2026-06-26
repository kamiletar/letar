import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { pressableConfig } from '@letar/ui'

import { semanticColors } from './semanticTokens'
import { colors } from './tokens'

/**
 * Конфигурация темы для archetest
 *
 * Палитра: фиолетовый (brand) + бирюзовый (accent)
 * Тема психологического тестирования
 */
const archetestConfig = defineConfig({
  theme: {
    tokens: {
      colors,
    },
    semanticTokens: {
      colors: semanticColors,
    },
    keyframes: {
      ...pressableConfig.keyframes,
    },
  },
  globalCss: {
    ...pressableConfig.globalCss,
  },
})

/**
 * Система стилей Chakra UI для archetest
 */
export const system = createSystem(defaultConfig, archetestConfig)

export { archetestConfig }
