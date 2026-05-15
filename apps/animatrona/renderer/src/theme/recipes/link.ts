import { defineRecipe } from '@chakra-ui/react'

/**
 * Link recipe с визуальной обратной связью
 *
 * Все варианты ссылок имеют:
 * - Плавные переходы
 * - transform: scale() при нажатии
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
