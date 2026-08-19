import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { pressableConfig } from '@letar/ui'

import { semanticColors } from './semanticTokens'
import { colors } from './tokens'

/**
 * Тема для synth — браузерная студия синтеза звука
 *
 * Философия: «звук становится геометрией и пространством».
 * Тёмная пустота (Малевич) + золото (Климт) + реактивный спин-граф.
 * forcedTheme="dark" — тёмная тема как единственная; нет переключателя.
 */
const synthConfig = defineConfig({
  theme: {
    tokens: { colors },
    semanticTokens: { colors: semanticColors },
    keyframes: {
      ...pressableConfig.keyframes,
    },
  },
  globalCss: {
    // Намеренно НЕ разливаем `pressableConfig.globalCss` целиком: его `_active: scale(0.93)`
    // перемножился бы с собственным `_active` кнопок synth (см. `PressableCta` в
    // `app/_components/pressable-cta.tsx`). Оставляем только то, что реально нужно —
    // снятие 300ms задержки клика на тач-устройствах.
    '[data-pressable]': {
      touchAction: 'manipulation',
    },
    'html, body': {
      bg: 'bg.DEFAULT',
      color: 'fg.DEFAULT',
      minHeight: '100dvh',
    },
    // Скроллбар в духе темы
    '::-webkit-scrollbar': { width: '6px', height: '6px' },
    '::-webkit-scrollbar-track': { bg: 'bg.subtle' },
    '::-webkit-scrollbar-thumb': { bg: 'border.gold', borderRadius: '3px' },
    '::-webkit-scrollbar-thumb:hover': { bg: 'accent.DEFAULT' },
    // Canvas-элементы (спин-граф) — без сглаживания по умолчанию
    canvas: { display: 'block' },
  },
})

/** Система стилей Chakra UI для synth */
export const system = createSystem(defaultConfig, synthConfig)
