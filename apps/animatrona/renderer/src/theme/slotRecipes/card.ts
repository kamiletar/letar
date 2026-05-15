import { defineSlotRecipe } from '@chakra-ui/react'

/**
 * Card slot recipe с transitions для интерактивных карточек
 */
export const cardRecipe = defineSlotRecipe({
  slots: ['root', 'header', 'body', 'footer', 'title', 'description'],
  variants: {
    variant: {
      outline: {
        root: {
          transition: 'all 0.15s ease-out',
        },
      },
      elevated: {
        root: {
          transition: 'all 0.15s ease-out',
        },
      },
      subtle: {
        root: {
          transition: 'all 0.15s ease-out',
        },
      },
    },
  },
})
