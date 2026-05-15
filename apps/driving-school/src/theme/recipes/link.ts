import { defineRecipe } from '@chakra-ui/react'

/**
 * Link recipe с тактильной обратной связью
 */
export const linkRecipe = defineRecipe({
  base: {
    transition: 'all 0.1s ease-out',
    _active: {
      transform: 'scale(0.9)',
    },
  },
  variants: {
    variant: {
      plain: {
        _active: {
          opacity: 0.7,
          '&:hover': {
            bg: 'currentColor/10',
          },
        },
      },
      underline: {
        _active: {
          opacity: 0.7,
          '&:hover': {
            bg: 'currentColor/10',
          },
        },
      },
    },
  },
})
