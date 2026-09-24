import { describe, expect, it } from 'vitest'
import { CREATE_OPTION_VALUE, isCreateOptionValue, mergeCreatedOptions, shouldOfferCreate } from './creatable-options'

describe('mergeCreatedOptions', () => {
  it('без созданных опций возвращает базовый список как есть', () => {
    const base = [{ label: 'A', value: 'a' }]
    expect(mergeCreatedOptions(base, [])).toBe(base)
  })

  it('добавляет созданную опцию в конец', () => {
    const merged = mergeCreatedOptions([{ label: 'A', value: 'a' }], [{ label: 'Новая', value: 'n' }])
    expect(merged.map((o) => o.value)).toEqual(['a', 'n'])
  })

  it('не дублирует опцию, которая уже пришла в базовом списке (приложение перезагрузило справочник)', () => {
    const merged = mergeCreatedOptions(
      [{ label: 'A', value: 'a' }, { label: 'Новая (с сервера)', value: 'n' }],
      [{ label: 'Новая', value: 'n' }],
    )
    expect(merged).toHaveLength(2)
    expect(merged[1]!.label).toBe('Новая (с сервера)')
  })

  it('сравнивает значения как строки: число 1 и строка "1" — одна опция', () => {
    const merged = mergeCreatedOptions([{ label: 'Один', value: 1 }], [{ label: 'Один', value: '1' }])
    expect(merged).toHaveLength(1)
  })
})

describe('shouldOfferCreate', () => {
  it('пустой и пробельный поиск не предлагает создание', () => {
    expect(shouldOfferCreate('', [])).toBe(false)
    expect(shouldOfferCreate('   ', [])).toBe(false)
  })

  it('предлагает, когда точного совпадения нет', () => {
    expect(shouldOfferCreate('Кровля', ['Кровельные работы'])).toBe(true)
  })

  it('не предлагает создать то, что уже есть (без учёта регистра и краевых пробелов)', () => {
    expect(shouldOfferCreate('  кровля ', ['Кровля'])).toBe(false)
  })
})

describe('isCreateOptionValue', () => {
  it('узнаёт служебное значение', () => {
    expect(isCreateOptionValue(CREATE_OPTION_VALUE)).toBe(true)
    expect(isCreateOptionValue('a')).toBe(false)
    expect(isCreateOptionValue(undefined)).toBe(false)
  })
})
