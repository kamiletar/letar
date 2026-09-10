import { menuAnatomy, radioGroupAnatomy, sliderAnatomy, tabsAnatomy } from '@chakra-ui/react/anatomy'
import { describe, expect, it } from 'vitest'
import { menuRecipe, radioRecipe, sliderRecipe, tabsRecipe } from './slotRecipes'

/**
 * Регрессия на баг positional-merge: `createSystem(defaultConfig, appConfig)` мержит массивы
 * `slots` ПО ИНДЕКСУ (`target[i] = source[i]`), а не по имени слота — короткий или переставленный
 * массив молча теряет реальные слоты стокового рецепта. Разбор — apps/domwellbes/src/theme/
 * recipes/controls.ts.
 */
function simulateMerge(target: readonly string[], source: readonly string[]): Set<string> {
  const merged = [...target]
  for (let i = 0; i < source.length; i++) {
    merged[i] = source[i]
  }
  return new Set(merged)
}

describe('slotRecipes — anatomy truncation regression', () => {
  it('menuRecipe.slots не теряет ни один слот реальной menuAnatomy', () => {
    const real = menuAnatomy.keys()
    const merged = simulateMerge(real, menuRecipe.slots as string[])
    for (const slot of real) {
      expect(merged.has(slot)).toBe(true)
    }
  })

  it('tabsRecipe.slots не теряет ни один слот реальной tabsAnatomy', () => {
    const real = tabsAnatomy.keys()
    const merged = simulateMerge(real, tabsRecipe.slots as string[])
    for (const slot of real) {
      expect(merged.has(slot)).toBe(true)
    }
  })

  it('sliderRecipe.slots не теряет ни один слот реальной sliderAnatomy', () => {
    const real = sliderAnatomy.keys()
    const merged = simulateMerge(real, sliderRecipe.slots as string[])
    for (const slot of real) {
      expect(merged.has(slot)).toBe(true)
    }
  })

  it('radioRecipe.slots не теряет ни один слот реальной radioGroupAnatomy', () => {
    const real = radioGroupAnatomy.keys()
    const merged = simulateMerge(real, radioRecipe.slots as string[])
    for (const slot of real) {
      expect(merged.has(slot)).toBe(true)
    }
  })
})
