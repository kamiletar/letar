import { keepPreviousData, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { getQueryKey } from '@zenstackhq/tanstack-query/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useInvalidateModels, useZenStackOptions } from '../zenstack'
import { fromSearchQuery } from './from-search-query'
import { fromSelectedQuery } from './from-selected-query'
import { useInvalidateAfter } from './use-invalidate-after'
import { useLoaderQuery } from './use-loader-query'
import { useQueryOptions } from './use-query-options'

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

interface Category {
  id: string
  name: string
}

describe('fromSearchQuery (Q1)', () => {
  it('хук получает enabled по minChars и placeholderData', () => {
    const useHook = vi.fn((_search: string, _options: unknown) => ({ data: [] as Category[] }))
    const useSearch = fromSearchQuery<Category, { data: Category[] }>(useHook, { minChars: 2 })
    useSearch('к')
    useSearch('кр')
    expect(useHook).toHaveBeenNthCalledWith(1, 'к', { enabled: false, placeholderData: keepPreviousData })
    expect(useHook).toHaveBeenNthCalledWith(2, 'кр', { enabled: true, placeholderData: keepPreviousData })
  })

  it('по умолчанию minChars — 1: пустая строка не запрашивается', () => {
    const useHook = vi.fn((_search: string, _options: unknown) => ({ data: [] as Category[] }))
    fromSearchQuery<Category, { data: Category[] }>(useHook)('')
    expect(useHook).toHaveBeenCalledWith('', expect.objectContaining({ enabled: false }))
  })

  it('со сменой строки прошлые данные не пропадают (настоящий useQuery)', async () => {
    const { wrapper } = createWrapper()
    let releaseSecond!: (rows: Category[]) => void
    const load = (search: string) =>
      search === 'а'
        ? Promise.resolve([{ id: '1', name: 'первый' }])
        : new Promise<Category[]>((resolve) => {
          releaseSecond = resolve
        })
    const useSearch = fromSearchQuery((search, options) =>
      useQuery({ queryKey: ['t', search], queryFn: () => load(search), ...options })
    )
    const { result, rerender } = renderHook(({ search }) => useSearch(search), {
      wrapper,
      initialProps: { search: 'а' },
    })
    await waitFor(() => expect(result.current.data).toEqual([{ id: '1', name: 'первый' }]))
    rerender({ search: 'аб' })
    expect(result.current.data).toEqual([{ id: '1', name: 'первый' }])
    expect(result.current.isPlaceholderData).toBe(true)
    await act(async () => releaseSecond([]))
    await waitFor(() => expect(result.current.data).toEqual([]))
  })
})

describe('fromSelectedQuery', () => {
  it('enabled — по непустому значению', () => {
    const useHook = vi.fn((_value: string, _options: unknown) => ({ data: null }))
    const useSelected = fromSelectedQuery<Category, { data: null }>(useHook)
    useSelected('')
    useSelected('a')
    expect(useHook).toHaveBeenNthCalledWith(1, '', { enabled: false })
    expect(useHook).toHaveBeenNthCalledWith(2, 'a', { enabled: true })
  })
})

describe('useQueryOptions (Q2)', () => {
  const rows: Category[] = [{ id: 'a', name: 'Кровля' }, { id: 'b', name: 'Фасад' }]
  const map = (row: Category) => ({ label: row.name, value: row.id })

  it('маппинг, data: row, loading из isLoading', () => {
    const { result } = renderHook(() => useQueryOptions({ data: rows, isLoading: false }, map))
    expect(result.current.fieldProps).toEqual({
      options: [
        { label: 'Кровля', value: 'a', data: rows[0] },
        { label: 'Фасад', value: 'b', data: rows[1] },
      ],
      loading: false,
    })
  })

  it('пока данных нет — пустой список и loading', () => {
    const { result } = renderHook(() => useQueryOptions<Category>({ isLoading: true }, map))
    expect(result.current.fieldProps).toEqual({ options: [], loading: true })
  })

  it('ошибка запроса возвращается как есть', () => {
    const error = new Error('сеть')
    const { result } = renderHook(() => useQueryOptions<Category>({ error }, map))
    expect(result.current.error).toBe(error)
  })

  it('isPending помечает строки опций pending: true, остальные без флага', () => {
    const data = [rows[0]!, { id: 'tmp', name: 'Новая' }]
    const isPending = (row: Category) => row.id === 'tmp'
    const { result } = renderHook(() => useQueryOptions({ data, isLoading: false }, map, { isPending }))
    expect(result.current.fieldProps.options).toEqual([
      { label: 'Кровля', value: 'a', data: data[0] },
      { label: 'Новая', value: 'tmp', data: data[1], pending: true },
    ])
  })

  it('стабильные data и map — тот же массив опций между рендерами', () => {
    const { result, rerender } = renderHook(() => useQueryOptions({ data: rows, isLoading: false }, map))
    const first = result.current.fieldProps.options
    rerender()
    expect(result.current.fieldProps.options).toBe(first)
  })
})

describe('useZenStackOptions (Q5)', () => {
  const map = (row: Category & { $optimistic?: boolean }) => ({ label: row.name, value: row.id })

  it('строки с $optimistic получают pending, обычные — нет', () => {
    const data = [{ id: 'a', name: 'Кровля' }, { id: 'tmp', name: 'Новая', $optimistic: true }]
    const { result } = renderHook(() => useZenStackOptions({ data, isLoading: false }, map))
    expect(result.current.fieldProps.options).toEqual([
      { label: 'Кровля', value: 'a', data: data[0] },
      { label: 'Новая', value: 'tmp', data: data[1], pending: true },
    ])
  })

  it('$optimistic: false — не pending', () => {
    const data = [{ id: 'a', name: 'Кровля', $optimistic: false }]
    const { result } = renderHook(() => useZenStackOptions({ data, isLoading: false }, map))
    expect(result.current.fieldProps.options[0]).not.toHaveProperty('pending')
  })
})

describe('useLoaderQuery (Q3)', () => {
  it('повтор той же строки берётся из кэша; signal доходит до загрузчика', async () => {
    const { wrapper } = createWrapper()
    const load = vi.fn(async (_search: string, _ctx: { signal: AbortSignal }) => [{ id: 'a', name: 'Кровля' }])
    const { result, rerender } = renderHook(
      ({ search }) => useLoaderQuery(['cats'], load)(search),
      { wrapper, initialProps: { search: 'к' } },
    )
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'a', name: 'Кровля' }]))
    expect(load).toHaveBeenCalledWith('к', expect.objectContaining({ signal: expect.any(AbortSignal) }))

    rerender({ search: 'кр' })
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    rerender({ search: 'к' })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'a', name: 'Кровля' }]))
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('invalidateQueries по ключу → перезапрос', async () => {
    const { wrapper, client } = createWrapper()
    let name = 'Кровля'
    const load = vi.fn(async () => [{ id: 'a', name }])
    const { result } = renderHook(() => useLoaderQuery(['cats'], load)('к'), { wrapper })
    await waitFor(() => expect(result.current.data?.[0]?.name).toBe('Кровля'))
    name = 'Кровля v2'
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['cats'] })
    })
    await waitFor(() => expect(result.current.data?.[0]?.name).toBe('Кровля v2'))
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('ниже minChars запрос не уходит', async () => {
    const { wrapper } = createWrapper()
    const load = vi.fn(async () => [])
    renderHook(() => useLoaderQuery(['cats'], load, { minChars: 2 })('к'), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(load).not.toHaveBeenCalled()
  })
})

describe('useInvalidateAfter (Q4)', () => {
  it('обёрнутый onCreate резолвится ПОСЛЕ рефетча активного запроса по ключу', async () => {
    const { wrapper, client } = createWrapper()
    let serverRows = ['Кровля']
    const events: string[] = []
    const { result } = renderHook(
      () => ({
        query: useQuery({
          queryKey: ['cats'],
          queryFn: async () => {
            events.push('fetch')
            await new Promise((resolve) => setTimeout(resolve, 20))
            return [...serverRows]
          },
        }),
        invalidateAfter: useInvalidateAfter([['cats']]),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.query.data).toEqual(['Кровля']))

    const onCreate = result.current.invalidateAfter(async (name: string) => {
      serverRows = [...serverRows, name]
      return { label: name, value: name }
    })
    events.length = 0
    const created = await onCreate('Фасад')
    // Рефетч уже завершён к моменту, когда поле получило опцию
    expect(events).toEqual(['fetch'])
    expect(created).toEqual({ label: 'Фасад', value: 'Фасад' })
    expect(client.getQueryData(['cats'])).toEqual(['Кровля', 'Фасад'])
  })

  it('отказ пользователя (null) ничего не инвалидирует', async () => {
    const { wrapper, client } = createWrapper()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useInvalidateAfter([['cats']]), { wrapper })
    const onCreate = result.current(async (_name: string) => null)
    expect(await onCreate('x')).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('useInvalidateModels (Q5, инвалидация)', () => {
  it('перезапрашивает запросы своей модели и не трогает другие', async () => {
    const { wrapper } = createWrapper()
    const categoryFetch = vi.fn(async () => ['c'])
    const userFetch = vi.fn(async () => ['u'])
    const { result } = renderHook(
      () => ({
        category: useQuery({
          queryKey: getQueryKey('WorkCategory', 'findMany', { where: { a: 1 } }),
          queryFn: categoryFetch,
        }),
        user: useQuery({ queryKey: getQueryKey('User', 'findMany', undefined), queryFn: userFetch }),
        invalidateModels: useInvalidateModels(['WorkCategory']),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.category.data).toEqual(['c']))
    await waitFor(() => expect(result.current.user.data).toEqual(['u']))

    const onCreate = result.current.invalidateModels(async (_name: string) => ({ label: 'x', value: 'x' }))
    await onCreate('x')
    expect(categoryFetch).toHaveBeenCalledTimes(2)
    expect(userFetch).toHaveBeenCalledTimes(1)
  })
})
