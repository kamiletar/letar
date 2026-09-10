import { defineSlotRecipe } from '@chakra-ui/react'

// Слоты — реальная `radioGroupAnatomy` Chakra v3 (`item`/`itemControl`/`itemIndicator`/...), не
// legacy-именование v2 (`control`/`group`) — `createSystem(defaultConfig, appConfig)` мержит
// массивы слотов ПОЗИЦИОННО (`mergeWith`/`merge` проходит только `source.length` элементов и
// перезаписывает `target[i] = source[i]` по индексу, не по имени), короткий/неверный список молча
// теряет реальные слоты anatomy. См. apps/driving-school/src/theme/recipes/slotRecipes.ts,
// apps/aboi/src/theme/slotRecipes/fields.ts.
const radioGroupAnatomyOrder = [
  'root',
  'label',
  'item',
  'itemText',
  'itemControl',
  'indicator',
  'itemAddon',
  'itemIndicator',
] as const

/** Радио: scale при нажатии + brand palette (RadioGroup, регистрируется под ключом `radioGroup`) */
export const radioRecipe = defineSlotRecipe({
  slots: [...radioGroupAnatomyOrder],
  base: {
    root: { colorPalette: 'brand', cursor: 'pointer' },
    label: { cursor: 'pointer' },
    itemControl: {
      cursor: 'pointer',
      transition: 'all 0.1s ease-out',
      // Мелкая поверхность (control радио) — вне диапазона pressScale, см. её JSDoc.
      _active: { transform: 'scale(0.9)' },
    },
  },
})
