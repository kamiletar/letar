import { defineSemanticTokens } from '@chakra-ui/react'

/**
 * Семантические токены цветов synth
 *
 * Всегда тёмная тема. forcedTheme="dark" в Provider.
 * Золото светится, пустота поглощает.
 */
export const semanticColors = defineSemanticTokens.colors({
  /* Фон — пустота Малевича */
  bg: {
    DEFAULT: { value: '{colors.void.950}' },
    subtle: { value: '{colors.void.900}' },
    muted: { value: '{colors.void.800}' },
    surface: { value: '{colors.forge.900}' },
    elevated: { value: '{colors.forge.800}' },
    overlay: { value: 'rgba(4, 3, 2, 0.85)' },
  },

  /* Текст — тёплый белый, слоновая кость */
  fg: {
    DEFAULT: { value: '{colors.void.50}' },
    muted: { value: '{colors.void.300}' },
    subtle: { value: '{colors.void.400}' },
    gold: { value: '{colors.gold.300}' },
  },

  /* Границы */
  border: {
    DEFAULT: { value: '{colors.forge.700}' },
    subtle: { value: '{colors.forge.800}' },
    gold: { value: '{colors.gold.700}' },
  },

  /* Акцент — золото Климта */
  accent: {
    DEFAULT: { value: '{colors.gold.400}' },
    subtle: { value: '{colors.gold.900}' },
    muted: { value: '{colors.gold.800}' },
    emphasized: { value: '{colors.gold.300}' },
    fg: { value: '{colors.void.950}' },
  },

  /* colorPalette для совместимости с Chakra компонентами */
  colorPalette: {
    solid: { value: '{colors.gold.500}' },
    contrast: { value: '{colors.void.950}' },
    fg: { value: '{colors.gold.300}' },
    muted: { value: '{colors.gold.900}' },
    subtle: { value: '{colors.gold.950}' },
    emphasized: { value: '{colors.gold.700}' },
    focusRing: { value: '{colors.gold.400}' },
  },
})
