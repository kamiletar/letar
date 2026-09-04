import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REDACTION_PLACEHOLDER,
  getAtPath,
  isKeyOrAncestorOfSensitivePath,
  omitAtPaths,
  redactAtPaths,
} from './sensitive-path-utils'

describe('getAtPath', () => {
  it('резолвит вложенный путь', () => {
    expect(getAtPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
  })

  it('возвращает undefined для несуществующего пути', () => {
    expect(getAtPath({ a: { b: 1 } }, 'a.x.y')).toBeUndefined()
  })

  it('резолвит топ-уровневый путь', () => {
    expect(getAtPath({ apiKey: 'secret' }, 'apiKey')).toBe('secret')
  })

  it('не падает на примитивах/null на пути', () => {
    expect(getAtPath({ a: null }, 'a.b')).toBeUndefined()
    expect(getAtPath({ a: 'str' }, 'a.b')).toBeUndefined()
  })
})

describe('redactAtPaths', () => {
  it('заменяет значение по вложенному пути плейсхолдером, не трогая соседей', () => {
    const value = { apiKey: { isEdited: true, value: 'sk-real-secret' }, name: 'Иван' }
    const result = redactAtPaths(value, ['apiKey.value'])

    expect(result).toEqual({
      apiKey: { isEdited: true, value: DEFAULT_REDACTION_PLACEHOLDER },
      name: 'Иван',
    })
    // Исходный объект не мутирован
    expect(value.apiKey.value).toBe('sk-real-secret')
  })

  it('поддерживает кастомный плейсхолдер', () => {
    const result = redactAtPaths({ password: 'hunter2' }, ['password'], '[hidden]')
    expect(result).toEqual({ password: '[hidden]' })
  })

  it('несколько путей одновременно', () => {
    const value = { a: { secret: 1 }, b: { secret: 2 }, c: 3 }
    const result = redactAtPaths(value, ['a.secret', 'b.secret'])
    expect(result).toEqual({
      a: { secret: DEFAULT_REDACTION_PLACEHOLDER },
      b: { secret: DEFAULT_REDACTION_PLACEHOLDER },
      c: 3,
    })
  })

  it('несуществующий путь — no-op, без ошибки', () => {
    const value = { a: 1 }
    expect(redactAtPaths(value, ['b.c'])).toEqual({ a: 1 })
  })

  it('не спускается в массивы на пути', () => {
    const value = { items: [{ secret: 1 }] }
    expect(redactAtPaths(value, ['items.secret'])).toEqual(value)
  })
})

describe('omitAtPaths', () => {
  it('полностью вырезает ключ по вложенному пути', () => {
    const value = { apiKey: { isEdited: true, value: 'sk-real-secret' } }
    const result = omitAtPaths(value, ['apiKey.value'])

    expect(result).toEqual({ apiKey: { isEdited: true } })
    expect('value' in result.apiKey).toBe(false)
  })

  it('вырезает топ-уровневый ключ целиком', () => {
    const result = omitAtPaths({ password: 'x', name: 'Иван' }, ['password'])
    expect(result).toEqual({ name: 'Иван' })
  })

  it('несуществующий путь — no-op', () => {
    expect(omitAtPaths({ a: 1 }, ['b.c'])).toEqual({ a: 1 })
  })
})

describe('isKeyOrAncestorOfSensitivePath', () => {
  it('топ-уровневый ключ совпадает с чувствительным путём', () => {
    expect(isKeyOrAncestorOfSensitivePath('password', ['password'])).toBe(true)
  })

  it('топ-уровневый ключ — предок вложенного чувствительного пути', () => {
    expect(isKeyOrAncestorOfSensitivePath('apiKey', ['apiKey.value'])).toBe(true)
  })

  it('несвязанный ключ — false', () => {
    expect(isKeyOrAncestorOfSensitivePath('name', ['apiKey.value'])).toBe(false)
  })

  it('похожий, но не совпадающий по границе сегмента ключ — false', () => {
    // "apiKeys" не должен ложно матчить чувствительный путь "apiKey.value"
    expect(isKeyOrAncestorOfSensitivePath('apiKeys', ['apiKey.value'])).toBe(false)
  })
})
