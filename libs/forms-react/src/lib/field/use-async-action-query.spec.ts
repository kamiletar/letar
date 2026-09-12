import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createAsyncActionQuery, useAsyncActionQuery } from './use-async-action-query'

describe('useAsyncActionQuery', () => {
  it('не вызывает action и не грузит, пока search пуст', () => {
    const action = vi.fn().mockResolvedValue([])
    const { result } = renderHook(() => useAsyncActionQuery('', action))

    expect(action).not.toHaveBeenCalled()
    expect(result.current).toEqual({ data: undefined, isLoading: false, error: null })
  })

  it('вызывает action при непустом search и отдаёт data после резолва', async () => {
    const action = vi.fn().mockResolvedValue([{ id: '1', name: 'Кирпич' }])
    const { result, rerender } = renderHook(({ search }) => useAsyncActionQuery(search, action), {
      initialProps: { search: '' },
    })

    rerender({ search: 'кир' })
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(action).toHaveBeenCalledWith('кир')
    expect(result.current.data).toEqual([{ id: '1', name: 'Кирпич' }])
    expect(result.current.error).toBeNull()
  })

  it('отдаёт error, если action упал, и не роняет isLoading в подвешенном состоянии', async () => {
    const action = vi.fn().mockRejectedValue(new Error('боевая ошибка'))
    const { result, rerender } = renderHook(({ search }) => useAsyncActionQuery(search, action), {
      initialProps: { search: '' },
    })

    rerender({ search: 'кир' })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toEqual(new Error('боевая ошибка'))
    expect(result.current.data).toBeUndefined()
  })

  it('игнорирует ответ устаревшего запроса (быстрый набор текста)', async () => {
    let resolveFirst: ((value: { id: string }[]) => void) | undefined
    const action = vi.fn().mockImplementation((search: string) => {
      if (search === 'к') {
        return new Promise<{ id: string }[]>((resolve) => {
          resolveFirst = resolve
        })
      }
      return Promise.resolve([{ id: 'кирпич' }])
    })

    const { result, rerender } = renderHook(({ search }) => useAsyncActionQuery(search, action), {
      initialProps: { search: '' },
    })

    rerender({ search: 'к' })
    rerender({ search: 'кирпич' })

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 'кирпич' }])
    })

    // Устаревший запрос ("к") резолвится ПОСЛЕ актуального — не должен перетереть свежий результат
    act(() => {
      resolveFirst?.([{ id: 'стекло' }])
    })

    expect(result.current.data).toEqual([{ id: 'кирпич' }])
  })
})

describe('createAsyncActionQuery', () => {
  it('оборачивает action в AsyncQueryFn, совместимый с useQuery-пропом', async () => {
    const action = vi.fn().mockResolvedValue([{ id: '1' }])
    const useQuery = createAsyncActionQuery(action)

    const { result, rerender } = renderHook(({ search }) => useQuery(search), {
      initialProps: { search: '' },
    })

    expect(result.current).toEqual({ data: undefined, isLoading: false, error: null })

    rerender({ search: 'test' })

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: '1' }])
    })
  })
})
