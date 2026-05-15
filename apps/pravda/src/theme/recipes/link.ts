import { defineRecipe } from '@chakra-ui/react'

/**
 * Link recipe с тактильной обратной связью через :active стили
 *
 * Все ссылки имеют:
 * - transform: scale(0.95) при нажатии
 * - Быстрые переходы 0.1s ease-out
 * - Варианты: plain и underline с opacity эффектом
 */
export const linkRecipe = defineRecipe({
  base: {
    transition: 'all 0.1s ease-out',
    _active: {
      transform: 'scale(0.95)',
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
