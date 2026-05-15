import { defineRecipe } from '@chakra-ui/react'

/**
 * Button recipe с тактильной обратной связью через :active стили
 */
export const buttonRecipe = defineRecipe({
  base: {
    transition: 'all 0.15s ease-out',
    _active: {
      transform: 'scale(0.95)',
    },
    _disabled: {
      _active: {
        transform: 'none',
      },
    },
  },
  variants: {
    size: {
      xs: { _active: { transform: 'scale(0.9)' } },
      sm: { _active: { transform: 'scale(0.9)' } },
      md: { _active: { transform: 'scale(0.95)' } },
      lg: { _active: { transform: 'scale(0.97)' } },
      xl: { _active: { transform: 'scale(0.98)' } },
    },
    variant: {
      solid: {
        _active: {
          bg: 'colorPalette.solid/80',
        },
      },
      subtle: {
        _active: {
          bg: 'colorPalette.emphasized',
        },
      },
      surface: {
        _active: {
          bg: 'bg.muted',
        },
      },
      outline: {
        _active: {
          bg: 'colorPalette.muted',
        },
      },
      ghost: {
        _active: {
          bg: 'bg.muted',
        },
      },
      plain: {
        _active: { opacity: 0.8 },
      },
    },
  },
})
