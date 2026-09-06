import { defineSlotRecipe } from '@chakra-ui/react'

/**
 * Checkbox slot recipe с cursor: pointer и визуальной обратной связью
 *
 * Решает проблему дефолтного курсора на чекбоксах.
 * colorPalette устанавливается в base.root для фирменного цвета.
 *
 * Глубина нажатия control НЕ переведена на общую `pressScale` (@letar/ui) — control чекбокса
 * мельче нижнего шага шкалы (`2xs` = 0.94), ему нужно более заметное проседание. См. JSDoc
 * `pressScale` в libs/ui, раздел «Когда НЕ использовать эту шкалу».
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
