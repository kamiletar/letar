import { radioGroupAnatomy } from '@chakra-ui/react/anatomy'
import { describe, expect, it } from 'vitest'
import { radioRecipe } from './slotRecipes'

/**
 * Регрессия на баг positional-merge: `createSystem(defaultConfig, appConfig)` мержит массивы
 * `slots` ПО ИНДЕКСУ (`target[i] = source[i]`), а не по имени слота — короткий или неверно
 * именованный массив (legacy v2 `control`/`group` вместо `itemControl`/...) молча теряет реальные
 * слоты стокового рецепта. Разбор — apps/driving-school/src/theme/recipes/slotRecipes.ts,
 * apps/aboi/src/theme/slotRecipes/fields.ts, .claude/docs/chakra-slot-recipe-array-merge-truncation.md.
 *
 * Тест проверяет, что после симуляции того же позиционного мержа ни один слот реальной
 * radioGroupAnatomy не теряется.
 */
function simulateMerge(target: readonly string[], source: readonly string[]): Set<string> {
  const merged = [...target]
  for (let i = 0; i < source.length; i++) {
    merged[i] = source[i]
  }
  return new Set(merged)
}

describe('radioRecipe — anatomy truncation regression', () => {
  it('radioRecipe.slots не теряет ни один слот реальной radioGroupAnatomy', () => {
    const real = radioGroupAnatomy.keys()
    const merged = simulateMerge(real, radioRecipe.slots as string[])
    for (const slot of real) {
      expect(merged.has(slot)).toBe(true)
    }
  })
})
