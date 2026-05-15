import { describe, expect, it } from 'vitest'
import { deepEqual } from './deep-equal'

describe('deepEqual', () => {
  // Примитивы
  it('сравнивает примитивы', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual('a', 'b')).toBe(false)
    expect(deepEqual(true, true)).toBe(true)
    expect(deepEqual(true, false)).toBe(false)
  })

  it('обрабатывает null и undefined', () => {
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(undefined, undefined)).toBe(true)
    expect(deepEqual(null, undefined)).toBe(false)
    expect(deepEqual(null, 0)).toBe(false)
    expect(deepEqual(undefined, '')).toBe(false)
  })

  it('обрабатывает NaN', () => {
    expect(deepEqual(NaN, NaN)).toBe(true)
    expect(deepEqual(NaN, 0)).toBe(false)
  })

  // Date
  it('сравнивает Date', () => {
    const d1 = new Date('2024-01-01')
    const d2 = new Date('2024-01-01')
    const d3 = new Date('2024-01-02')
    expect(deepEqual(d1, d2)).toBe(true)
    expect(deepEqual(d1, d3)).toBe(false)
  })

  // RegExp
  it('сравнивает RegExp', () => {
    expect(deepEqual(/abc/gi, /abc/gi)).toBe(true)
    expect(deepEqual(/abc/g, /abc/i)).toBe(false)
    expect(deepEqual(/abc/, /def/)).toBe(false)
  })

  // Массивы
  it('сравнивает массивы', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual([1, 2, 3], [1, 3, 2])).toBe(false)
    expect(deepEqual([], [])).toBe(true)
  })

  // Объекты
  it('сравнивает объекты', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(deepEqual({}, {})).toBe(true)
  })

  // Вложенные структуры
  it('сравнивает вложенные объекты', () => {
    const a = { user: { name: 'Иван', address: { city: 'Москва' } } }
    const b = { user: { name: 'Иван', address: { city: 'Москва' } } }
    const c = { user: { name: 'Иван', address: { city: 'Питер' } } }
    expect(deepEqual(a, b)).toBe(true)
    expect(deepEqual(a, c)).toBe(false)
  })

  it('сравнивает массивы объектов', () => {
    const a = [
      { value: '1', label: 'Один' },
      { value: '2', label: 'Два' },
    ]
    const b = [
      { value: '1', label: 'Один' },
      { value: '2', label: 'Два' },
    ]
    const c = [
      { value: '1', label: 'Один' },
      { value: '2', label: 'Три' },
    ]
    expect(deepEqual(a, b)).toBe(true)
    expect(deepEqual(a, c)).toBe(false)
  })

  // Circular references
  it('не падает на циклических ссылках', () => {
    const a: Record<string, unknown> = { x: 1 }
    a.self = a
    const b: Record<string, unknown> = { x: 1 }
    b.self = b
    // Не падает, возвращает false (не может доказать равенство)
    expect(deepEqual(a, b)).toBe(false)
  })

  // Разные типы
  it('различает разные типы', () => {
    expect(deepEqual(1, '1')).toBe(false)
    expect(deepEqual([], {})).toBe(false)
    expect(deepEqual(null, {})).toBe(false)
    expect(deepEqual(0, false)).toBe(false)
  })

  // Порядок ключей
  it('не зависит от порядка ключей', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
  })
})
