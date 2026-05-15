import { defineSlotRecipe } from '@chakra-ui/react'

/**
 * Progress slot recipe
 *
 * colorPalette устанавливается в base.root для фирменного цвета.
 * Используется для прогресс-баров импорта и транскодирования.
 */
export const progressRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'track', 'range', 'valueText', 'view', 'circle', 'circleTrack', 'circleRange'],
  base: {
    root: {
      colorPalette: 'brand',
    },
    range: {
      transition: 'width 0.3s ease-out',
    },
  },
})
