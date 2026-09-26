import type { ComponentType } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createForm, type ExtendedForm, type FormRegistryCheck } from './create-form'

const Stub: ComponentType<{ name: string }> = () => null

// Типовые проверки живут на уровне компиляции (`nx typecheck:tsgo`): @ts-expect-error без ошибки — сам по себе ошибка
describe('generic createForm и FormRegistryCheck (E8)', () => {
  const AppForm = createForm({
    extraSelects: { Unit: Stub },
    lazySelects: { WorkCategory: async () => Stub },
    lazyComboboxes: { Counterparty: async () => Stub },
  })

  it('ключи выводятся из extra* и lazy*: опечатка — ошибка типов', () => {
    expectTypeOf(AppForm.Select).toHaveProperty('Unit')
    expectTypeOf(AppForm.Select).toHaveProperty('WorkCategory')
    expectTypeOf(AppForm.Combobox).toHaveProperty('Counterparty')

    // @ts-expect-error — такого ключа нет в реестре
    void AppForm.Select.WorkCategry
    // @ts-expect-error — ключ есть у Combobox, но не у Select
    void AppForm.Select.Counterparty

    expect(AppForm.Select.Unit).toBeDefined()
  })

  it('без опций ключи — string: любое имя компилируется, как раньше', () => {
    const Bare = createForm()
    void Bare.Select.Anything
    void Bare.Combobox.Anything
    void Bare.Listbox.Anything
    expectTypeOf(Bare).toMatchTypeOf<ExtendedForm>()
  })

  it('FormRegistryCheck: все ключи есть — true', () => {
    const ok: FormRegistryCheck<typeof AppForm, 'Unit' | 'WorkCategory', 'Counterparty'> = true
    expect(ok).toBe(true)
  })

  it('FormRegistryCheck: недостающий ключ — ошибка присваивания', () => {
    // @ts-expect-error — `Status` не зарегистрирован в extraSelects/lazySelects
    const missing: FormRegistryCheck<typeof AppForm, 'Unit' | 'Status'> = true
    expect(missing).toBe(true)
  })

  it('FormRegistryCheck: инстанс с аннотацией ExtendedForm (ключи стёрты) — ошибка', () => {
    const erased: ExtendedForm = AppForm as unknown as ExtendedForm
    // @ts-expect-error — индексная сигнатура: проверять нечего, «зелёная» проверка была бы ложной
    const check: FormRegistryCheck<typeof erased, 'Unit'> = true
    expect(check).toBe(true)
  })

  it('FormRegistryCheck: пустые списки ключей проходят и на стёртом инстансе', () => {
    const erased: ExtendedForm = AppForm as unknown as ExtendedForm
    const check: FormRegistryCheck<typeof erased, never> = true
    expect(check).toBe(true)
  })
})
