import { describe, expect, it } from 'vitest'
import { filterSelectionOptions, matchesSearchQuery, resolveSearchable, SELECT_SEARCH_THRESHOLD } from './search'

describe('resolveSearchable', () => {
  it('порог по умолчанию — 9: поиск с 10-й опции', () => {
    expect(SELECT_SEARCH_THRESHOLD).toBe(9)
    expect(resolveSearchable('auto', 9, '')).toBe(false)
    expect(resolveSearchable('auto', 10, '')).toBe(true)
    expect(resolveSearchable(undefined, 10, '')).toBe(true)
  })

  it('false выключает всегда, true включает всегда', () => {
    expect(resolveSearchable(false, 100, '')).toBe(false)
    expect(resolveSearchable(false, 100, 'абв')).toBe(false)
    expect(resolveSearchable(true, 3, '')).toBe(true)
  })

  it('объект: свой порог, 0 — всегда', () => {
    expect(resolveSearchable({ threshold: 4 }, 4, '')).toBe(false)
    expect(resolveSearchable({ threshold: 4 }, 5, '')).toBe(true)
    expect(resolveSearchable({ threshold: 0 }, 1, '')).toBe(true)
    expect(resolveSearchable({}, 10, '')).toBe(true)
  })

  it('гистерезис: непустой запрос не даёт полю поиска пропасть', () => {
    expect(resolveSearchable('auto', 3, 'кр')).toBe(true)
    expect(resolveSearchable({ threshold: 20 }, 3, 'кр')).toBe(true)
    expect(resolveSearchable('auto', 3, '')).toBe(false)
  })
})

describe('matchesSearchQuery', () => {
  it('без регистра, ё ≡ е', () => {
    expect(matchesSearchQuery('Кровля', 'КРОВ')).toBe(true)
    expect(matchesSearchQuery('Ёлка', 'елка')).toBe(true)
    expect(matchesSearchQuery('Елка', 'ёлка')).toBe(true)
  })

  it('без диакритики', () => {
    expect(matchesSearchQuery('Café', 'cafe')).toBe(true)
  })

  it('подстрока, а не префикс', () => {
    expect(matchesSearchQuery('Ремонт кровли', 'кровл')).toBe(true)
    expect(matchesSearchQuery('Фасад', 'кровл')).toBe(false)
  })
})

const options = [
  { value: 'w1', label: 'Кровля' },
  { value: 'w2', label: 'Привет, мир' },
  { value: 'w3', label: 'Фасад' },
  { value: 'w4', label: 'Roofing' },
  { value: 'w5', label: 'Ремонт бани' },
]
const text = (o: { label: string }) => o.label

describe('filterSelectionOptions', () => {
  it('пустой и пробельный запрос возвращает всё', () => {
    expect(filterSelectionOptions(options, '', text)).toHaveLength(5)
    expect(filterSelectionOptions(options, '   ', text)).toHaveLength(5)
  })

  it('обычный запрос', () => {
    expect(filterSelectionOptions(options, 'кров', text).map((o) => o.value)).toEqual(['w1'])
  })

  it('«ghbdtn» находит «Привет»', () => {
    expect(filterSelectionOptions(options, 'ghbdtn', text).map((o) => o.value)).toEqual(['w2'])
  })

  it('«rhjdkz» находит «Кровля»', () => {
    expect(filterSelectionOptions(options, 'rhjdkz', text).map((o) => o.value)).toEqual(['w1'])
  })

  it('латинская опция находится по латинскому запросу', () => {
    expect(filterSelectionOptions(options, 'roof', text).map((o) => o.value)).toEqual(['w4'])
  })

  it('слово с «б» в EN-раскладке', () => {
    expect(filterSelectionOptions(options, ',fyb', text).map((o) => o.value)).toEqual(['w5'])
  })

  it('смешанный ввод не исправляется', () => {
    expect(filterSelectionOptions(options, 'кровrhjdkz', text)).toEqual([])
  })

  it('свой предикат', () => {
    const exact = (t: string, q: string) => t === q
    expect(filterSelectionOptions(options, 'Фасад', text, exact).map((o) => o.value)).toEqual(['w3'])
  })

  it('возвращает новый массив', () => {
    expect(filterSelectionOptions(options, '', text)).not.toBe(options)
  })
})
