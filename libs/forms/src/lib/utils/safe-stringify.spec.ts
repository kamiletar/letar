import { describe, expect, it } from 'vitest'
import { safeStringify } from './safe-stringify'

describe('safeStringify', () => {
  it('null/undefined → тире', () => {
    expect(safeStringify(null)).toBe('—')
    expect(safeStringify(undefined)).toBe('—')
  })

  it('boolean → Да/Нет', () => {
    expect(safeStringify(true)).toBe('Да')
    expect(safeStringify(false)).toBe('Нет')
  })

  it('Date → локализованная строка', () => {
    const date = new Date('2024-03-15')
    const result = safeStringify(date)
    // Формат зависит от окружения, но не должен быть пустым
    expect(result).toBeTruthy()
    expect(result).not.toBe('—')
  })

  it('массив → через запятую', () => {
    expect(safeStringify([1, 2, 3])).toBe('1, 2, 3')
    expect(safeStringify(['a', 'b'])).toBe('a, b')
    expect(safeStringify([])).toBe('')
  })

  it('число → строка', () => {
    expect(safeStringify(42)).toBe('42')
    expect(safeStringify(3.14)).toBe('3.14')
  })

  it('строка → как есть', () => {
    expect(safeStringify('hello')).toBe('hello')
  })

  it('BigInt → строка', () => {
    expect(safeStringify(BigInt(123))).toBe('123')
  })

  it('объект → JSON', () => {
    expect(safeStringify({ a: 1 })).toBe('{"a":1}')
  })

  it('circular ref → не падает', () => {
    const obj: Record<string, unknown> = { x: 1 }
    obj.self = obj
    const result = safeStringify(obj)
    expect(result).toContain('[Circular]')
    expect(result).toContain('"x":1')
  })

  it('Map → как объект', () => {
    const map = new Map([['key', 'value']])
    expect(safeStringify(map)).toBe('{"key":"value"}')
  })

  it('Set → как массив', () => {
    const set = new Set([1, 2, 3])
    expect(safeStringify(set)).toBe('1, 2, 3')
  })

  it('вложенный массив значений', () => {
    expect(safeStringify([null, true, 42])).toBe('—, Да, 42')
  })
})
