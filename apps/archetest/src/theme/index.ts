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
    // Отказ от авто-затемнения браузера («Тёмный режим для сайтов» в Brave и Chrome на
    // Android). Он перекрашивает страницу, объявившую `color-scheme: light`, и светлая тема
    // становится неотличима от тёмной — ровно так и выглядела жалоба «темы не различаются»
    // (аудит 2026-09-24). Ключевое слово `only` запрещает браузеру подменять схему: у сайта
    // своя тёмная тема, автоматическая инверсия ей только мешает (ломает цвета диаграмм).
    // Поэтому next-themes не пишет инлайновый `color-scheme` (`enableColorScheme={false}`
    // в providers.tsx) — инлайновый стиль перебил бы это правило.
    'html.light': { colorScheme: 'only light' },
    'html.dark': { colorScheme: 'dark' },
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
