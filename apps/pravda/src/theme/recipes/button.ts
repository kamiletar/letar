import { defineRecipe } from '@chakra-ui/react'

/**
 * Button recipe с тактильной обратной связью через :active стили
 *
 * Все кнопки имеют:
 * - transform: scale() при нажатии (размер зависит от size)
 * - Плавные переходы 0.15s ease-out
 * - Отключение эффекта для disabled состояния
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
  },
})
