import { describe, expect, it } from 'vitest'
import {
  buildQueryHref,
  buildQueryStateHref,
  createQueryStateCodec,
  diffFromDefaults,
  hasActiveFilters,
  mergeQueryState,
} from './query-state'

const defaults = { color: '', sizes: [] as string[], sort: 'popular' }

describe('createQueryStateCodec', () => {
  const codec = createQueryStateCodec(defaults)

  it('parse возвращает дефолты для пустых параметров', () => {
    expect(codec.parse(new URLSearchParams())).toEqual(defaults)
  })

  it('parse читает строковое и множественное поле', () => {
    const params = new URLSearchParams('color=red&sizes=M&sizes=L')
    expect(codec.parse(params)).toEqual({ color: 'red', sizes: ['M', 'L'], sort: 'popular' })
  })

  it('serialize опускает поля, совпадающие с дефолтом', () => {
    const params = codec.serialize({ color: 'red', sizes: [], sort: 'popular' })
    expect(params.toString()).toBe('color=red')
  })

  it('serialize кодирует массив несколькими одноимёнными параметрами', () => {
    const params = codec.serialize({ color: '', sizes: ['M', 'L'], sort: 'popular' })
    expect(params.getAll('sizes')).toEqual(['M', 'L'])
  })

  it('parse ⇄ serialize — обратимо для нетривиального состояния', () => {
    const state = { color: 'red', sizes: ['M', 'L'], sort: 'newest' }
    const roundTripped = codec.parse(codec.serialize(state))
    expect(roundTripped).toEqual(state)
  })
})

describe('mergeQueryState', () => {
  it('патчит только переданные поля, остальные — из текущего состояния', () => {
    const current = { color: 'red', sizes: ['M'], sort: 'popular' }
    expect(mergeQueryState(current, { color: 'blue' })).toEqual({
      color: 'blue',
      sizes: ['M'],
      sort: 'popular',
    })
  })
})

describe('buildQueryHref', () => {
  it('не добавляет "?" для пустых параметров', () => {
    expect(buildQueryHref('/catalog', new URLSearchParams())).toBe('/catalog')
  })

  it('добавляет query-строку', () => {
    expect(buildQueryHref('/catalog', new URLSearchParams('color=red'))).toBe('/catalog?color=red')
  })
})

describe('buildQueryStateHref', () => {
  const codec = createQueryStateCodec(defaults)

  it('применяет patch поверх текущего состояния, не поверх дефолтов', () => {
    const current = { color: 'red', sizes: ['M'], sort: 'newest' }
    const href = buildQueryStateHref('/catalog', codec, current, { color: 'blue' })
    const params = new URL(href, 'https://example.test').searchParams
    expect(params.get('color')).toBe('blue')
    expect(params.getAll('sizes')).toEqual(['M']) // не забыто третьим измерением
    expect(params.get('sort')).toBe('newest')
  })
})

describe('diffFromDefaults / hasActiveFilters', () => {
  it('пустой дифф для состояния, равного дефолту', () => {
    expect(diffFromDefaults(defaults, defaults)).toEqual([])
    expect(hasActiveFilters(defaults, defaults)).toBe(false)
  })

  it('находит только реально изменённые поля', () => {
    const state = { color: 'red', sizes: [] as string[], sort: 'popular' }
    expect(diffFromDefaults(state, defaults)).toEqual([{ key: 'color', value: 'red' }])
    expect(hasActiveFilters(state, defaults)).toBe(true)
  })
})
