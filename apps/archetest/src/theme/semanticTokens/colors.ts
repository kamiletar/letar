import { defineSemanticTokens } from '@chakra-ui/react'

/**
 * Семантические цветовые токены для archetest
 *
 * Все токены имеют _light и _dark варианты
 */
export const semanticColors = defineSemanticTokens.colors({
  bg: {
    DEFAULT: {
      value: { _light: '{colors.gray.50}', _dark: '{colors.gray.900}' },
    },
    surface: {
      value: { _light: 'white', _dark: '{colors.gray.800}' },
    },
    subtle: {
      value: { _light: '{colors.gray.100}', _dark: '{colors.gray.700}' },
    },
    muted: {
      value: { _light: '{colors.gray.200}', _dark: '{colors.gray.600}' },
    },
    emphasized: {
      value: { _light: '{colors.gray.300}', _dark: '{colors.gray.500}' },
    },
    inverted: {
      value: { _light: '{colors.gray.900}', _dark: 'white' },
    },
    panel: {
      value: { _light: 'white', _dark: '{colors.gray.800}' },
    },
  },

  fg: {
    DEFAULT: {
      value: { _light: '{colors.gray.900}', _dark: '{colors.gray.50}' },
    },
    muted: {
      value: { _light: '{colors.gray.600}', _dark: '{colors.gray.400}' },
    },
    subtle: {
      value: { _light: '{colors.gray.500}', _dark: '{colors.gray.500}' },
    },
    inverted: {
      value: { _light: 'white', _dark: '{colors.gray.900}' },
    },
  },

  border: {
    DEFAULT: {
      value: { _light: '{colors.gray.200}', _dark: '{colors.gray.700}' },
    },
    muted: {
      value: { _light: '{colors.gray.100}', _dark: '{colors.gray.800}' },
    },
    subtle: {
      value: { _light: '{colors.gray.100}', _dark: '{colors.gray.800}' },
    },
    emphasized: {
      value: { _light: '{colors.gray.300}', _dark: '{colors.gray.600}' },
    },
  },

  brand: {
    solid: {
      value: { _light: '{colors.brand.500}', _dark: '{colors.brand.400}' },
    },
    contrast: {
      value: { _light: 'white', _dark: '{colors.gray.900}' },
    },
    fg: {
      value: { _light: '{colors.brand.700}', _dark: '{colors.brand.200}' },
    },
    muted: {
      value: { _light: '{colors.brand.200}', _dark: '{colors.brand.700}' },
    },
    subtle: {
      value: { _light: '{colors.brand.100}', _dark: '{colors.brand.900}' },
    },
    emphasized: {
      value: { _light: '{colors.brand.300}', _dark: '{colors.brand.600}' },
    },
    focusRing: {
      value: { _light: '{colors.brand.500}', _dark: '{colors.brand.400}' },
    },
    border: {
      value: { _light: '{colors.brand.200}', _dark: '{colors.brand.700}' },
    },
  },

  accent: {
    solid: {
      value: { _light: '{colors.accent.600}', _dark: '{colors.accent.400}' },
    },
    contrast: {
      value: { _light: 'white', _dark: '{colors.gray.900}' },
    },
    fg: {
      value: { _light: '{colors.accent.700}', _dark: '{colors.accent.200}' },
    },
    muted: {
      value: { _light: '{colors.accent.200}', _dark: '{colors.accent.700}' },
    },
    subtle: {
      value: { _light: '{colors.accent.100}', _dark: '{colors.accent.900}' },
    },
    emphasized: {
      value: { _light: '{colors.accent.300}', _dark: '{colors.accent.600}' },
    },
    focusRing: {
      value: { _light: '{colors.accent.600}', _dark: '{colors.accent.400}' },
    },
    border: {
      value: { _light: '{colors.accent.200}', _dark: '{colors.accent.700}' },
    },
  },

  success: {
    solid: {
      value: { _light: '{colors.success.500}', _dark: '{colors.success.400}' },
    },
    contrast: {
      value: { _light: 'white', _dark: '{colors.gray.900}' },
    },
    fg: {
      value: { _light: '{colors.success.700}', _dark: '{colors.success.200}' },
    },
    muted: {
      value: { _light: '{colors.success.200}', _dark: '{colors.success.700}' },
    },
    subtle: {
      value: { _light: '{colors.success.50}', _dark: '{colors.success.950}' },
    },
    emphasized: {
      value: { _light: '{colors.success.300}', _dark: '{colors.success.600}' },
    },
    focusRing: {
      value: { _light: '{colors.success.500}', _dark: '{colors.success.400}' },
    },
    border: {
      value: { _light: '{colors.success.200}', _dark: '{colors.success.700}' },
    },
  },

  warning: {
    solid: {
      value: { _light: '{colors.warning.500}', _dark: '{colors.warning.400}' },
    },
    contrast: {
      value: { _light: '{colors.gray.900}', _dark: '{colors.gray.900}' },
    },
    fg: {
      value: { _light: '{colors.warning.700}', _dark: '{colors.warning.200}' },
    },
    muted: {
      value: { _light: '{colors.warning.200}', _dark: '{colors.warning.700}' },
    },
    subtle: {
      value: { _light: '{colors.warning.50}', _dark: '{colors.warning.950}' },
    },
    emphasized: {
      value: { _light: '{colors.warning.300}', _dark: '{colors.warning.600}' },
    },
    focusRing: {
      value: { _light: '{colors.warning.500}', _dark: '{colors.warning.400}' },
    },
    border: {
      value: { _light: '{colors.warning.200}', _dark: '{colors.warning.700}' },
    },
  },

  error: {
    solid: {
      value: { _light: '{colors.error.500}', _dark: '{colors.error.400}' },
    },
    contrast: {
      value: { _light: 'white', _dark: '{colors.gray.900}' },
    },
    fg: {
      value: { _light: '{colors.error.700}', _dark: '{colors.error.200}' },
    },
    muted: {
      value: { _light: '{colors.error.200}', _dark: '{colors.error.700}' },
    },
    subtle: {
      value: { _light: '{colors.error.50}', _dark: '{colors.error.500/10}' },
    },
    emphasized: {
      value: { _light: '{colors.error.300}', _dark: '{colors.error.600}' },
    },
    focusRing: {
      value: { _light: '{colors.error.500}', _dark: '{colors.error.400}' },
    },
    border: {
      value: { _light: '{colors.error.200}', _dark: '{colors.error.800}' },
    },
  },

  info: {
    solid: {
      value: { _light: '{colors.info.500}', _dark: '{colors.info.400}' },
    },
    contrast: {
      value: { _light: 'white', _dark: '{colors.gray.900}' },
    },
    fg: {
      value: { _light: '{colors.info.700}', _dark: '{colors.info.200}' },
    },
    muted: {
      value: { _light: '{colors.info.200}', _dark: '{colors.info.700}' },
    },
    subtle: {
      value: { _light: '{colors.info.50}', _dark: '{colors.info.950}' },
    },
    emphasized: {
      value: { _light: '{colors.info.300}', _dark: '{colors.info.600}' },
    },
    focusRing: {
      value: { _light: '{colors.info.500}', _dark: '{colors.info.400}' },
    },
    border: {
      value: { _light: '{colors.info.200}', _dark: '{colors.info.700}' },
    },
  },
})
