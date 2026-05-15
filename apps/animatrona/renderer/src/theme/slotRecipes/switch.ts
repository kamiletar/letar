import { defineSlotRecipe } from '@chakra-ui/react'

/**
 * Switch slot recipe с анимацией
 *
 * colorPalette устанавливается в base.root для фирменного цвета.
 */
export const switchRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'control', 'thumb', 'indicator'],
  base: {
    root: {
      colorPalette: 'brand',
    },
    control: {
      transition: 'all 0.15s ease-out',
    },
    thumb: {
      transition: 'all 0.15s ease-out',
    },
  },
})
