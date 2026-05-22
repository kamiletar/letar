import { describe, expect, it } from 'vitest'
import { readUrlValues } from './use-form-url-sync'

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
    const result = readUrlValues(
      ['search', 'category'],
      defaults,
      new URLSearchParams('search=hello&category=books'),
    )
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
