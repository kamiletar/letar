import { defineRecipe } from '@chakra-ui/react'
import { pressScale } from '@letar/ui'

/**
 * Button recipe с тактильной обратной связью через :active стили.
 * Глубина нажатия — общая шкала @letar/ui (`pressScale`), шаг по размеру кнопки.
 */
export const buttonRecipe = defineRecipe({
  base: {
    transition: 'all 0.15s ease-out',
    _active: {
      transform: pressScale.md,
    },
    _disabled: {
      _active: {
        transform: 'none',
      },
    },
  },
  variants: {
    size: {
      xs: { _active: { transform: pressScale.xs } },
      sm: { _active: { transform: pressScale.sm } },
      md: { _active: { transform: pressScale.md } },
      lg: { _active: { transform: pressScale.lg } },
      xl: { _active: { transform: pressScale.xl } },
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
