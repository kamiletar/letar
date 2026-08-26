import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearIdempotencyKey, getOrCreateIdempotencyKey } from './idempotency-key'

const STORAGE_KEY = 'test:idempotency-key'

describe('getOrCreateIdempotencyKey', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('генерирует новый ключ и сохраняет его в sessionStorage', () => {
    const key = getOrCreateIdempotencyKey(STORAGE_KEY)

    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(key)
  })

  it('возвращает тот же ключ при повторном вызове', () => {
    const first = getOrCreateIdempotencyKey(STORAGE_KEY)
    const second = getOrCreateIdempotencyKey(STORAGE_KEY)

    expect(second).toBe(first)
  })

  it('разные storageKey не пересекаются', () => {
    const a = getOrCreateIdempotencyKey('test:a')
    const b = getOrCreateIdempotencyKey('test:b')

    expect(a).not.toBe(b)
  })

  it('возвращает свежий ключ, если sessionStorage бросает исключение', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const key = getOrCreateIdempotencyKey(STORAGE_KEY)

    expect(key).toMatch(/^[0-9a-f-]{36}$/)

    spy.mockRestore()
  })
})

describe('clearIdempotencyKey', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('удаляет сохранённый ключ', () => {
    getOrCreateIdempotencyKey(STORAGE_KEY)
    clearIdempotencyKey(STORAGE_KEY)

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('не бросает исключение при недоступном sessionStorage', () => {
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(() => clearIdempotencyKey(STORAGE_KEY)).not.toThrow()

    spy.mockRestore()
  })
})
