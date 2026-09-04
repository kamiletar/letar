import { describe, expect, it } from 'vitest'
import { getActiveUrlSyncFields, isDefaultValue, readUrlValues } from './use-form-url-sync'

const defaults = {
  search: '',
  category: 'all',
  minPrice: 0,
  active: false,
  tags: [] as string[],
}

describe('readUrlValues', () => {
  it('returns defaults when params are empty', () => {
    const result = readUrlValues(['search', 'category'], defaults, new URLSearchParams())
    expect(result).toEqual(defaults)
  })

  it('reads string fields', () => {
    const result = readUrlValues(['search', 'category'], defaults, new URLSearchParams('search=hello&category=books'))
    expect(result.search).toBe('hello')
    expect(result.category).toBe('books')
  })

  it('coerces number fields based on defaults type', () => {
    const result = readUrlValues(['minPrice'], defaults, new URLSearchParams('minPrice=500'))
    expect(result.minPrice).toBe(500)
    expect(typeof result.minPrice).toBe('number')
  })

  it('coerces boolean fields', () => {
    const result = readUrlValues(['active'], defaults, new URLSearchParams('active=true'))
    expect(result.active).toBe(true)
  })

  it('reads array fields (repeated params)', () => {
    const result = readUrlValues(['tags'], defaults, new URLSearchParams('tags=react&tags=forms'))
    expect(result.tags).toEqual(['react', 'forms'])
  })

  it('ignores fields not in whitelist', () => {
    const result = readUrlValues(['search'], defaults, new URLSearchParams('search=hello&utm_source=habr'))
    expect(result.search).toBe('hello')
    expect((result as Record<string, unknown>)['utm_source']).toBeUndefined()
  })

  it('ignores NaN for number fields — falls back to default', () => {
    const result = readUrlValues(['minPrice'], defaults, new URLSearchParams('minPrice=notanumber'))
    expect(result.minPrice).toBe(0)
  })

  it('merges URL values with defaults (unspecified fields keep defaults)', () => {
    const result = readUrlValues(['search'], defaults, new URLSearchParams('search=hi'))
    expect(result.category).toBe('all')
    expect(result.minPrice).toBe(0)
  })
})

describe('isDefaultValue', () => {
  it('matches primitives by ===', () => {
    expect(isDefaultValue('all', 'all')).toBe(true)
    expect(isDefaultValue('books', 'all')).toBe(false)
  })

  it('matches equal arrays element-by-element (order-sensitive)', () => {
    expect(isDefaultValue(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(isDefaultValue(['b', 'a'], ['a', 'b'])).toBe(false)
    expect(isDefaultValue(['a'], ['a', 'b'])).toBe(false)
  })
})

describe('getActiveUrlSyncFields', () => {
  it('returns empty array when all values match defaults', () => {
    const active = getActiveUrlSyncFields(defaults, ['search', 'category', 'minPrice'], defaults)
    expect(active).toEqual([])
  })

  it('returns only fields differing from defaults, with their values', () => {
    const values = { ...defaults, search: 'hello', minPrice: 500 }
    const active = getActiveUrlSyncFields(values, ['search', 'category', 'minPrice'], defaults)
    expect(active).toEqual([
      { field: 'search', value: 'hello' },
      { field: 'minPrice', value: 500 },
    ])
  })

  it('respects the field whitelist (ignores fields outside it even if non-default)', () => {
    const values = { ...defaults, search: 'hello', category: 'books' }
    const active = getActiveUrlSyncFields(values, ['search'], defaults)
    expect(active).toEqual([{ field: 'search', value: 'hello' }])
  })

  it('treats equal arrays as default (order-sensitive)', () => {
    const values = { ...defaults, tags: ['react', 'forms'] }
    const activeSame = getActiveUrlSyncFields({ ...values, tags: [] }, ['tags'], defaults)
    expect(activeSame).toEqual([])

    const activeDiff = getActiveUrlSyncFields(values, ['tags'], defaults)
    expect(activeDiff).toEqual([{ field: 'tags', value: ['react', 'forms'] }])
  })
})
