import { describe, expect, it } from 'vitest'
import { parseFieldRegistryType } from './field-registry-type'

describe('parseFieldRegistryType (E1)', () => {
  it('разбирает ссылки всех трёх пространств', () => {
    expect(parseFieldRegistryType('Select.WorkCategory')).toEqual({ namespace: 'Select', key: 'WorkCategory' })
    expect(parseFieldRegistryType('Combobox.Counterparty')).toEqual({ namespace: 'Combobox', key: 'Counterparty' })
    expect(parseFieldRegistryType('Listbox.Tag2')).toEqual({ namespace: 'Listbox', key: 'Tag2' })
  })

  it('встроенные типы — null', () => {
    expect(parseFieldRegistryType('select')).toBeNull()
    expect(parseFieldRegistryType('combobox')).toBeNull()
    expect(parseFieldRegistryType('string')).toBeNull()
  })

  it('неверный синтаксис — null', () => {
    expect(parseFieldRegistryType('Select.')).toBeNull()
    expect(parseFieldRegistryType('Select.lower')).toBeNull()
    expect(parseFieldRegistryType('Select.With Space')).toBeNull()
    expect(parseFieldRegistryType('Select.A.B')).toBeNull()
    expect(parseFieldRegistryType('Foo.Bar')).toBeNull()
    expect(parseFieldRegistryType('select.WorkCategory')).toBeNull()
    expect(parseFieldRegistryType('')).toBeNull()
  })
})
