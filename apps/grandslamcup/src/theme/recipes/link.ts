import { defineRecipe } from '@chakra-ui/react'
import { pressScale } from '@letar/ui'

/**
 * Link recipe с тактильной обратной связью.
 * Глубина нажатия — общая шкала @letar/ui (`pressScale`), шаг `sm`: ссылка мельче кнопки.
 */
export const linkRecipe = defineRecipe({
  base: {
    transition: 'all 0.1s ease-out',
    _active: {
      transform: pressScale.sm,
    },
  },
  variants: {
    variant: {
      plain: {
        _active: {
          opacity: 0.7,
        },
      },
      underline: {
        _active: {
          opacity: 0.7,
        },
      },
    },
  },
})
