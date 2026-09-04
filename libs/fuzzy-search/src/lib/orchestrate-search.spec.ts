import { describe, expect, it, vi } from 'vitest'
import { orchestrateSearch } from './orchestrate-search'

describe('orchestrateSearch', () => {
  it('возвращает буквальный результат, если его достаточно', async () => {
    const runSearch = vi.fn().mockResolvedValue({ items: ['a', 'b', 'c'], total: 3 })

    const result = await orchestrateSearch({ query: 'машина', runSearch })

    expect(runSearch).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ usedQuery: 'машина', wasCorrected: false })
  })

  it('переключается на раскладку, если её результатов заметно больше', async () => {
    const runSearch = vi.fn(async (q: string) => {
      if (q === 'vfibyf') { return { items: [], total: 0 } }
      if (q === 'машина') { return { items: ['found1', 'found2'], total: 2 } }
      throw new Error(`неожиданный запрос: ${q}`)
    })

    const result = await orchestrateSearch({ query: 'vfibyf', runSearch })

    expect(result).toMatchObject({
      usedQuery: 'машина',
      literalQuery: 'vfibyf',
      wasCorrected: true,
      items: ['found1', 'found2'],
    })
  })

  it('не переключается, если исправленный вариант не намного лучше буквального', async () => {
    const runSearch = vi.fn(async (q: string) => {
      if (q === 'vfibyf') { return { items: ['x'], total: 1 } }
      return { items: ['y', 'z'], total: 2 } // 2x порог не достигнут (нужно >= 2 * 1 = 2, граница)
    })

    const result = await orchestrateSearch({
      query: 'vfibyf',
      runSearch,
      threshold: { minResults: 3, correctedMultiplier: 3 },
    })

    expect(result.wasCorrected).toBe(false)
    expect(result.items).toEqual(['x'])
  })

  it('зовёт suggestFallback, если оба запроса дали ноль результатов', async () => {
    const runSearch = vi.fn().mockResolvedValue({ items: [], total: 0 })
    const suggestFallback = vi.fn().mockResolvedValue(['популярное1', 'популярное2'])

    const result = await orchestrateSearch({
      query: 'vfibyf',
      runSearch,
      suggestFallback,
    })

    expect(suggestFallback).toHaveBeenCalledTimes(1)
    expect(result.fallbackSuggestions).toEqual(['популярное1', 'популярное2'])
    expect(result.items).toEqual([])
  })

  it('не гоняет второй запрос, если раскладку определить нельзя', async () => {
    const runSearch = vi.fn().mockResolvedValue({ items: [], total: 0 })

    await orchestrateSearch({ query: '12345', runSearch })

    expect(runSearch).toHaveBeenCalledTimes(1)
  })
})
