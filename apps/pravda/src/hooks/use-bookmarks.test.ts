import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __resetBookmarksCache, type Bookmark, useBookmarks } from './use-bookmarks'

// Тестовые данные
const testBookmark: Omit<Bookmark, 'addedAt'> = {
  id: 'constitution-1',
  title: 'Конституция',
  articleNumber: '1',
  href: '/constitution#article-1',
  category: 'Основные законы',
}

const testBookmark2: Omit<Bookmark, 'addedAt'> = {
  id: 'tax-5',
  title: 'Налоговый кодекс',
  articleNumber: '5',
  href: '/codes/tax#article-5',
  category: 'Кодексы',
}

describe('useBookmarks', () => {
  beforeEach(() => {
    // Очищаем localStorage перед каждым тестом
    window.localStorage.clear()
    // Сбрасываем кеш хука
    __resetBookmarksCache()
  })

  afterEach(() => {
    // Очищаем localStorage после каждого теста
    window.localStorage.clear()
    // Сбрасываем кеш хука
    __resetBookmarksCache()
    vi.clearAllMocks()
  })

  it('должен инициализироваться с пустым массивом закладок', () => {
    const { result } = renderHook(() => useBookmarks())

    expect(result.current.bookmarks).toEqual([])
  })

  it('должен добавлять закладку', () => {
    const { result } = renderHook(() => useBookmarks())

    act(() => {
      result.current.addBookmark(testBookmark)
    })

    // Проверяем что закладка сохранена в localStorage
    const stored = localStorage.getItem('pravda-bookmarks')
    expect(stored).not.toBeNull()

    const parsed = JSON.parse(stored!) as Bookmark[]
    expect(parsed.length).toBe(1)
    expect(parsed[0].id).toBe(testBookmark.id)
  })

  it('должен сохранять закладку с датой добавления', () => {
    const { result } = renderHook(() => useBookmarks())

    act(() => {
      result.current.addBookmark(testBookmark)
    })

    // Получаем сохранённые данные
    const stored = localStorage.getItem('pravda-bookmarks')
    const parsed = JSON.parse(stored!) as Bookmark[]

    expect(parsed[0]).toMatchObject({
      id: testBookmark.id,
      title: testBookmark.title,
      articleNumber: testBookmark.articleNumber,
    })
    expect(parsed[0].addedAt).toBeDefined()
    expect(new Date(parsed[0].addedAt).getTime()).not.toBeNaN()
  })

  it('не должен добавлять дубликат закладки', () => {
    const { result } = renderHook(() => useBookmarks())

    // Добавляем первый раз
    act(() => {
      result.current.addBookmark(testBookmark)
    })

    const storedAfterFirst = localStorage.getItem('pravda-bookmarks')
    const countAfterFirst = JSON.parse(storedAfterFirst!).length

    // Добавляем второй раз ту же закладку
    act(() => {
      result.current.addBookmark(testBookmark)
    })

    const storedAfterSecond = localStorage.getItem('pravda-bookmarks')
    const countAfterSecond = JSON.parse(storedAfterSecond!).length

    // Количество должно остаться прежним
    expect(countAfterSecond).toBe(countAfterFirst)
  })

  it('должен удалять закладку', () => {
    // Предварительно добавляем закладку
    const existingBookmarks: Bookmark[] = [{ ...testBookmark, addedAt: new Date().toISOString() }]
    localStorage.setItem('pravda-bookmarks', JSON.stringify(existingBookmarks))

    const { result } = renderHook(() => useBookmarks())

    act(() => {
      result.current.removeBookmark(testBookmark.id)
    })

    // Проверяем что закладка удалена
    const stored = localStorage.getItem('pravda-bookmarks')
    const parsed = JSON.parse(stored!) as Bookmark[]
    expect(parsed).toEqual([])
  })

  it('должен проверять наличие закладки через isBookmarked', () => {
    const existingBookmarks: Bookmark[] = [{ ...testBookmark, addedAt: new Date().toISOString() }]
    localStorage.setItem('pravda-bookmarks', JSON.stringify(existingBookmarks))

    const { result } = renderHook(() => useBookmarks())

    expect(result.current.isBookmarked(testBookmark.id)).toBe(true)
    expect(result.current.isBookmarked('nonexistent-id')).toBe(false)
  })

  it('должен переключать состояние закладки через toggleBookmark', () => {
    const { result } = renderHook(() => useBookmarks())

    // Добавляем через toggle
    act(() => {
      result.current.toggleBookmark(testBookmark)
    })

    // Проверяем что добавилась
    let stored = localStorage.getItem('pravda-bookmarks')
    let parsed = JSON.parse(stored!) as Bookmark[]
    expect(parsed.length).toBe(1)

    // Удаляем через toggle
    act(() => {
      result.current.toggleBookmark(testBookmark)
    })

    // Проверяем что удалилась
    stored = localStorage.getItem('pravda-bookmarks')
    parsed = JSON.parse(stored!) as Bookmark[]
    expect(parsed.length).toBe(0)
  })

  it('должен очищать все закладки через clearBookmarks', () => {
    const existingBookmarks: Bookmark[] = [
      { ...testBookmark, addedAt: new Date().toISOString() },
      { ...testBookmark2, addedAt: new Date().toISOString() },
    ]
    localStorage.setItem('pravda-bookmarks', JSON.stringify(existingBookmarks))

    const { result } = renderHook(() => useBookmarks())

    act(() => {
      result.current.clearBookmarks()
    })

    const stored = localStorage.getItem('pravda-bookmarks')
    expect(JSON.parse(stored!)).toEqual([])
  })

  it('должен восстанавливать закладки из localStorage', () => {
    const existingBookmarks: Bookmark[] = [
      { ...testBookmark, addedAt: '2025-01-01T00:00:00.000Z' },
      { ...testBookmark2, addedAt: '2025-01-02T00:00:00.000Z' },
    ]
    localStorage.setItem('pravda-bookmarks', JSON.stringify(existingBookmarks))

    const { result } = renderHook(() => useBookmarks())

    expect(result.current.bookmarks).toHaveLength(2)
    expect(result.current.bookmarks[0].id).toBe(testBookmark.id)
    expect(result.current.bookmarks[1].id).toBe(testBookmark2.id)
  })

  it('должен возвращать пустой массив при ошибке парсинга JSON', () => {
    localStorage.setItem('pravda-bookmarks', 'invalid json')

    const { result } = renderHook(() => useBookmarks())

    expect(result.current.bookmarks).toEqual([])
  })
})
