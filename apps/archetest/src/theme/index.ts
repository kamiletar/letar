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
    // Высококонтрастный режим (этап 5.4, outdoor/exhibition use):
    // усиливаем приглушённый текст и границы для читаемости при ярком свете.
    // Переключается хуком useHighContrast (атрибут data-contrast на <html>).
    //
    // `!important` обязателен: globalCss попадает в @layer base, а токены Chakra —
    // в @layer tokens, который в порядке `reset,base,tokens,recipes` идёт позже и
    // выигрывает по каскадным слоям. important-объявление бьёт нормальные в любом слое.
    'html[data-contrast="high"]': {
      '--chakra-colors-fg-muted': 'var(--chakra-colors-fg) !important',
      '--chakra-colors-fg-subtle': 'var(--chakra-colors-fg) !important',
      '--chakra-colors-border': 'var(--chakra-colors-border-emphasized) !important',
      '--chakra-colors-border-muted': 'var(--chakra-colors-border-emphasized) !important',
      '--chakra-colors-border-subtle': 'var(--chakra-colors-border-emphasized) !important',
    },
  },
})

/**
 * Система стилей Chakra UI для archetest
 */
export const system = createSystem(defaultConfig, archetestConfig)

export { archetestConfig }
