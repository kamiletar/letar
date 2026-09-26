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
    // Печать / «Сохранить в PDF» (волна 7.6): навигация, кнопки, баннеры и тосты не нужны на
    // бумаге; карточки не рвутся между страницами. Светлую тему на время печати включает
    // PrintButton (класс на <html>), здесь только то, что решается одним CSS. Условие `_print`, а не
    // вложенный '@media print': внутри него Chakra не принимает произвольные селекторы (TS2353).
    'header, [data-print-hide], [data-scope="toast"]': { _print: { display: 'none !important' } },
    '.chakra-card__root, [data-print-keep]': { _print: { breakInside: 'avoid' } },
    // Фоны (полосы баллов, бейджи) печатаются и при выключенной «печати фона» в диалоге
    body: { _print: { printColorAdjust: 'exact' } },
  },
})

/**
 * Система стилей Chakra UI для archetest
 */
export const system = createSystem(defaultConfig, archetestConfig)

export { archetestConfig }
