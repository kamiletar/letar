import { defineRecipe } from '@chakra-ui/react'
import { pressScale } from '@letar/ui'

/**
 * Link recipe с визуальной обратной связью.
 * Глубина нажатия — общая шкала @letar/ui (`pressScale`): у ссылки нет собственного
 * размера, поэтому шаг по умолчанию — `md`.
 */
export const linkRecipe = defineRecipe({
  base: {
    transition: 'all 0.1s ease-out',
    _active: {
      transform: pressScale.md,
    },
  },
  variants: {
    variant: {
      plain: {
        _active: {
          opacity: 0.8,
        },
      },
      underline: {
        _active: {
          opacity: 0.8,
        },
      },
    },
  },
})
