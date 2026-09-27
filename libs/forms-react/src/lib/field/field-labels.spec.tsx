import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useFieldLabelLookup, useRegisterFieldLabel } from './field-labels'

describe('реестр подписей полей', () => {
  it('подпись, зарегистрированная полем, видна читателю той же формы', () => {
    const form = {}
    const lookup = renderHook(() => useFieldLabelLookup(form))
    expect(lookup.result.current('country')).toBeUndefined()

    renderHook(() => useRegisterFieldLabel(form, 'country', 'Страна'))

    expect(lookup.result.current('country')).toBe('Страна')
  })

  it('чужая форма подписи не видит', () => {
    renderHook(() => useRegisterFieldLabel({}, 'country', 'Страна'))
    const other = renderHook(() => useFieldLabelLookup({}))
    expect(other.result.current('country')).toBeUndefined()
  })

  it('узловая подпись и пустая строка не регистрируются', () => {
    const form = {}
    renderHook(() => useRegisterFieldLabel(form, 'a', <b>Жирная</b>))
    renderHook(() => useRegisterFieldLabel(form, 'b', '   '))
    const lookup = renderHook(() => useFieldLabelLookup(form))
    expect(lookup.result.current('a')).toBeUndefined()
    expect(lookup.result.current('b')).toBeUndefined()
  })

  it('размонтирование поля снимает подпись, смена подписи обновляет читателя', () => {
    const form = {}
    const lookup = renderHook(() => useFieldLabelLookup(form))
    const field = renderHook(({ label }) => useRegisterFieldLabel(form, 'country', label), {
      initialProps: { label: 'Страна' },
    })
    expect(lookup.result.current('country')).toBe('Страна')

    act(() => field.rerender({ label: 'Страна проживания' }))
    expect(lookup.result.current('country')).toBe('Страна проживания')

    field.unmount()
    expect(lookup.result.current('country')).toBeUndefined()
  })

  it('идентичность функции меняется вместе с реестром — годится в зависимости useMemo', () => {
    const form = {}
    const lookup = renderHook(() => useFieldLabelLookup(form))
    const before = lookup.result.current
    renderHook(() => useRegisterFieldLabel(form, 'country', 'Страна'))
    expect(lookup.result.current).not.toBe(before)
  })
})
