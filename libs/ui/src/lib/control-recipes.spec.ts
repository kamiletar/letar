import { describe, expect, it } from 'vitest'

import { createControlRecipes } from './control-recipes'

describe('createControlRecipes', () => {
  it('по умолчанию берёт рамку из border.control', () => {
    const { recipes, slotRecipes } = createControlRecipes()

    expect(recipes.input.variants?.variant?.outline).toEqual({ borderColor: 'border.control' })
    expect(recipes.input.variants?.variant?.flushed).toEqual({ borderBottomColor: 'border.control' })
    expect(recipes.checkmark.variants?.variant?.solid).toEqual({ borderColor: 'border.control' })
    expect(slotRecipes.select.variants?.variant?.outline).toEqual({ trigger: { borderColor: 'border.control' } })
    expect(slotRecipes.nativeSelect.variants?.variant?.outline).toEqual({ field: { borderColor: 'border.control' } })
  })

  it('принимает своё имя токена', () => {
    const { recipes, slotRecipes } = createControlRecipes({ borderToken: 'border.field' })

    expect(recipes.textarea.variants?.variant?.outline).toEqual({ borderColor: 'border.field' })
    expect(slotRecipes.combobox.variants?.variant?.outline).toEqual({
      input: { borderColor: 'border.field' },
      trigger: { borderColor: 'border.field' },
    })
  })

  it('оставляет невалидное состояние радио на border.error', () => {
    const { recipes } = createControlRecipes({ borderToken: 'border.field' })

    expect(recipes.radiomark.base).toEqual({ _invalid: { borderColor: 'border.error' } })
  })

  it('перечисляет слоты в порядке настоящей anatomy (иначе merge по индексу вычёркивает слоты)', () => {
    const { slotRecipes } = createControlRecipes()

    expect(slotRecipes.select.slots?.slice(0, 3)).toEqual(['label', 'positioner', 'trigger'])
    expect(slotRecipes.select.slots).toHaveLength(16)
    expect(slotRecipes.nativeSelect.slots).toEqual(['root', 'field', 'indicator'])
    expect(slotRecipes.combobox.slots?.[0]).toBe('root')
    expect(slotRecipes.combobox.slots).toHaveLength(16)
  })
})
