import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchItem } from '@/lib/search-index'

// Мок search-index должен быть с vi.hoisted для работы с hoisting
const mockSearchIndex = vi.hoisted(
  () =>
    [
      {
        title: 'Конституция',
        category: 'Основные законы',
        articleNumber: '1',
        content: 'Государство признаёт и гарантирует права и свободы человека',
        href: '/constitution#article-1',
      },
      {
        title: 'Конституция',
        category: 'Основные законы',
        articleNumber: '2',
        content: 'Высшей ценностью является человек, его права и свободы',
        href: '/constitution#article-2',
      },
      {
        title: 'Налоговый кодекс',
        category: 'Кодексы',
        articleNumber: '1',
        content: 'Налоги устанавливаются только законом',
        href: '/codes/tax#article-1',
      },
      {
        title: 'Налоговый кодекс',
        category: 'Кодексы',
        articleNumber: '5',
        content: 'Ставка налога на прибыль составляет двадцать процентов',
        href: '/codes/tax#article-5',
      },
    ] as SearchItem[]
)

// Мокаем модуль search-index
vi.mock('@/lib/search-index', () => ({
  searchIndex: mockSearchIndex,
}))

// Импортируем хук после мока
import { useSearch } from './use-search'

/** Задержка debounce в use-search.ts */
const DEBOUNCE_DELAY = 300

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('должен инициализироваться с isLoading=true', () => {
    const { result } = renderHook(() => useSearch())

    expect(result.current.query).toBe('')
    expect(result.current.isLoading).toBe(true)
  })

  it('должен загрузить индекс и установить isLoading=false', async () => {
    const { result } = renderHook(() => useSearch())

    // Ждём загрузки индекса (реальные таймеры)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
  })

  it('должен вернуть пустой массив при query < 2 символов', async () => {
    const { result } = renderHook(() => useSearch())

    // Ждём загрузки индекса
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setQuery('п')
    })

    // Ждём debounce (реальный)
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY + 50))

    expect(result.current.query).toBe('п')
    expect(result.current.results).toEqual([])
    expect(result.current.isSearching).toBe(false)
  })

  it('должен найти статьи по ключевому слову', async () => {
    const { result } = renderHook(() => useSearch())

    // Ждём загрузки индекса
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setQuery('права')
    })

    // Ждём debounce
    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0)
      },
      { timeout: DEBOUNCE_DELAY + 100 }
    )

    expect(result.current.isSearching).toBe(true)
    expect(result.current.hasResults).toBe(true)

    // Проверяем что найдены статьи с "права"
    const foundContents = result.current.results.map((r) => r.item.content)
    expect(foundContents.some((c) => c.includes('права'))).toBe(true)
  })

  it('должен группировать результаты по документам', async () => {
    const { result } = renderHook(() => useSearch())

    // Ждём загрузки индекса
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setQuery('налог')
    })

    // Ждём debounce
    await waitFor(
      () => {
        expect(result.current.groupedResults.length).toBeGreaterThan(0)
      },
      { timeout: DEBOUNCE_DELAY + 100 }
    )

    // Проверяем структуру группы
    const group = result.current.groupedResults[0]
    expect(group).toHaveProperty('title')
    expect(group).toHaveProperty('category')
    expect(group).toHaveProperty('items')
    expect(Array.isArray(group.items)).toBe(true)
  })

  it('должен возвращать matches для подсветки', async () => {
    const { result } = renderHook(() => useSearch())

    // Ждём загрузки индекса
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setQuery('права')
    })

    // Ждём debounce
    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0)
      },
      { timeout: DEBOUNCE_DELAY + 100 }
    )

    // Проверяем что matches присутствуют
    const firstResult = result.current.results[0]
    expect(firstResult).toHaveProperty('matches')
  })

  it('должен обновлять hasResults при изменении query', async () => {
    const { result } = renderHook(() => useSearch())

    // Ждём загрузки индекса
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Изначально false
    expect(result.current.hasResults).toBe(false)

    // После поиска true
    act(() => {
      result.current.setQuery('человек')
    })
    await waitFor(
      () => {
        expect(result.current.hasResults).toBe(true)
      },
      { timeout: DEBOUNCE_DELAY + 100 }
    )

    // После очистки снова false
    act(() => {
      result.current.setQuery('')
    })
    await waitFor(
      () => {
        expect(result.current.hasResults).toBe(false)
      },
      { timeout: DEBOUNCE_DELAY + 100 }
    )
  })

  it('должен вернуть пустой массив для несуществующего запроса', async () => {
    const { result } = renderHook(() => useSearch())

    // Ждём загрузки индекса
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setQuery('xyznonexistent123')
    })

    // Ждём debounce
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY + 50))

    expect(result.current.results).toEqual([])
    expect(result.current.hasResults).toBe(false)
  })

  it('должен показывать isPending во время debounce', async () => {
    const { result } = renderHook(() => useSearch())

    // Ждём загрузки индекса
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // До ввода isPending = false
    expect(result.current.isPending).toBe(false)

    // Вводим запрос — isPending = true пока debounce не завершён
    act(() => {
      result.current.setQuery('права')
    })

    // Сразу после ввода isPending должен быть true
    expect(result.current.isPending).toBe(true)

    // После debounce isPending = false
    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false)
      },
      { timeout: DEBOUNCE_DELAY + 100 }
    )
  })
})
