import { defineRecipe } from '@chakra-ui/react'

/**
 * Button recipe с тактильной обратной связью через :active стили
 *
 * Все варианты кнопок имеют:
 * - transform: scale() при нажатии
 * - Плавные переходы
 * - Адаптация для разных размеров
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
      xs: {
        _active: {
          transform: 'scale(0.9)',
        },
      },
      sm: {
        _active: {
          transform: 'scale(0.9)',
        },
      },
      md: {
        _active: {
          transform: 'scale(0.95)',
        },
      },
      lg: {
        _active: {
          transform: 'scale(0.97)',
        },
      },
      xl: {
        _active: {
          transform: 'scale(0.98)',
        },
      },
    },
    variant: {
      solid: {
        bg: 'primary.solid',
        color: 'brand.contrast',
        _hover: {
          bg: 'brand.muted',
        },
        _active: {
          bg: 'colorPalette.solid/80',
          '&:hover': {
            bg: 'colorPalette.solid/50',
          },
        },
      },
      outline: {
        borderColor: 'primary.solid',
        color: 'primary.fg',
        _hover: {
          bg: 'primary.subtle',
        },
        _active: {
          bg: 'colorPalette.muted',
          '&:hover': {
            bg: 'colorPalette.subtle/50',
          },
        },
      },
      ghost: {
        _hover: {
          bg: 'bg.subtle',
        },
        _active: {
          bg: 'bg.muted',
          '&:hover': {
            bg: 'colorPalette.subtle/50',
          },
        },
      },
      subtle: {
        bg: 'primary.subtle',
        color: 'primary.fg',
        _hover: {
          bg: 'primary.muted',
        },
        _active: {
          bg: 'colorPalette.emphasized',
        },
      },
      surface: {
        bg: 'bg.surface',
        borderWidth: '1px',
        borderColor: 'border',
        _hover: {
          bg: 'bg.subtle',
        },
        _active: {
          bg: 'bg.muted',
        },
      },
      plain: {
        _active: {
          opacity: 0.8,
        },
      },
    },
  },
})
