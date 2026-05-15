import { defineSlotRecipe } from '@chakra-ui/react'

/**
 * Checkbox slot recipe с cursor: pointer и визуальной обратной связью
 *
 * Решает проблему дефолтного курсора на чекбоксах.
 * colorPalette устанавливается в base.root для фирменного цвета.
 */
export const checkboxRecipe = defineSlotRecipe({
  slots: ['root', 'label', 'control', 'indicator', 'group'],
  base: {
    root: {
      colorPalette: 'brand',
      cursor: 'pointer',
    },
    label: {
      cursor: 'pointer',
    },
    control: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      _active: {
        transform: 'scale(0.9)',
      },
    },
  },
})
