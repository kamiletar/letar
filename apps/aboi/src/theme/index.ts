import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

import { semanticColors } from './semanticTokens'
import { colors } from './tokens'

/**
 * Конфигурация темы НейроАбоИ
 *
 * - brand: терракот (#C25E3A) — тёплый земляной, ассоциация с обоями и уютом
 * - accent: фиолетово-синий (#5B4FB8) — нейро, подсознание
 * - Полная поддержка Dark Mode через semantic tokens
 */
const aboiConfig = defineConfig({
  theme: {
    tokens: {
      colors,
    },
    semanticTokens: {
      colors: semanticColors,
    },
  },
})

export const system = createSystem(defaultConfig, aboiConfig)
export { aboiConfig }
