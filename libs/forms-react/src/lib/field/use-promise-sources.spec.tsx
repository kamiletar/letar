import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOptionsLoader } from './use-options-loader'
import { usePromiseSearch } from './use-promise-search'
import { useSelectedLoader } from './use-selected-loader'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

interface Category {
  id: string
  name: string
}

describe('usePromiseSearch', () => {
  it('enabled: false — загрузчик не вызывается', () => {
    const loadOptions = vi.fn(async () => [])
    const { result } = renderHook(() => usePromiseSearch({ loadOptions, search: 'a', enabled: false }))
    expect(loadOptions).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('без loadOptions хук простаивает', () => {
    const { result } = renderHook(() => usePromiseSearch<Category>({ search: 'a', enabled: true }))
    expect(result.current).toMatchObject({ isLoading: false, data: undefined, error: null })
  })

  it('L2: новая строка поиска отменяет signal прошлого запроса; результат — только последнего', async () => {
    const signals: AbortSignal[] = []
    const loadOptions = vi.fn((search: string, { signal }: { signal: AbortSignal }) => {
      signals.push(signal)
      return Promise.resolve([{ id: search, name: search }])
    })
    const { result, rerender } = renderHook(
      ({ search }) => usePromiseSearch<Category>({ loadOptions, search, enabled: true }),
      { initialProps: { search: 'а' } },
    )
    rerender({ search: 'аб' })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'аб', name: 'аб' }]))
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)
  })

  it('L2: размонтирование отменяет текущий запрос', () => {
    let signal!: AbortSignal
    const loadOptions = vi.fn((_search: string, ctx: { signal: AbortSignal }) => {
      signal = ctx.signal
      return new Promise<Category[]>(() => undefined)
    })
    const { unmount } = renderHook(() => usePromiseSearch<Category>({ loadOptions, search: 'а', enabled: true }))
    expect(signal.aborted).toBe(false)
    unmount()
    expect(signal.aborted).toBe(true)
  })

  it('L2: AbortError не попадает в error и onLoadError', async () => {
    const onLoadError = vi.fn()
    const loadOptions = vi.fn(async () => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    })
    const { result } = renderHook(() =>
      usePromiseSearch<Category>({ loadOptions, search: 'а', enabled: true, onLoadError })
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.error).toBeNull()
    expect(onLoadError).not.toHaveBeenCalled()
  })

  it('L3: гонка — старый ответ приходит позже нового и signal игнорирует → на экране новый', async () => {
    const first = deferred<Category[]>()
    const second = deferred<Category[]>()
    const loadOptions = vi.fn((search: string) => (search === 'а' ? first.promise : second.promise))
    const { result, rerender } = renderHook(
      ({ search }) => usePromiseSearch<Category>({ loadOptions, search, enabled: true }),
      { initialProps: { search: 'а' } },
    )
    rerender({ search: 'аб' })
    await act(async () => {
      second.resolve([{ id: '2', name: 'новый' }])
      await second.promise
    })
    await act(async () => {
      first.resolve([{ id: '1', name: 'старый' }])
      await first.promise
    })
    expect(result.current.data).toEqual([{ id: '2', name: 'новый' }])
    expect(result.current.isLoading).toBe(false)
  })

  it('L4: прошлые результаты остаются, пока идёт новый запрос', async () => {
    const second = deferred<Category[]>()
    const loadOptions = vi.fn((search: string) =>
      search === 'а' ? Promise.resolve([{ id: '1', name: 'первый' }]) : second.promise
    )
    const { result, rerender } = renderHook(
      ({ search }) => usePromiseSearch<Category>({ loadOptions, search, enabled: true }),
      { initialProps: { search: 'а' } },
    )
    await waitFor(() => expect(result.current.data).toEqual([{ id: '1', name: 'первый' }]))
    rerender({ search: 'аб' })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toEqual([{ id: '1', name: 'первый' }])
    await act(async () => {
      second.resolve([])
      await second.promise
    })
    expect(result.current.isLoading).toBe(false)
  })

  it('L5: ошибка — error, данные скрыты, onLoadError один раз; reload зовёт загрузчик с той же строкой', async () => {
    const onLoadError = vi.fn()
    let fail = true
    const loadOptions = vi.fn(async (search: string) => {
      if (fail) {
        throw new Error('сеть')
      }
      return [{ id: search, name: search }]
    })
    const { result } = renderHook(() =>
      usePromiseSearch<Category>({ loadOptions, search: 'а', enabled: true, onLoadError })
    )
    await waitFor(() => expect((result.current.error as Error | null)?.message).toBe('сеть'))
    expect(result.current.data).toBeUndefined()
    expect(onLoadError).toHaveBeenCalledTimes(1)

    fail = false
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'а', name: 'а' }]))
    expect(result.current.error).toBeNull()
    expect(loadOptions).toHaveBeenLastCalledWith('а', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(onLoadError).toHaveBeenCalledTimes(1)
  })

  it('идентичность загрузчика не перезапускает запрос', async () => {
    const calls = vi.fn()
    const { rerender, result } = renderHook(() =>
      usePromiseSearch<Category>({
        loadOptions: async () => {
          calls()
          return []
        },
        search: 'а',
        enabled: true,
      })
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    rerender()
    rerender()
    expect(calls).toHaveBeenCalledTimes(1)
  })
})

describe('useSelectedLoader', () => {
  it('L7: значение вне выдачи — запись из loadSelected; повторный рендер не зовёт его снова', async () => {
    const loadSelected = vi.fn(async (value: string) => ({ id: value, name: 'Кровля' }))
    const { result, rerender } = renderHook(() =>
      useSelectedLoader<Category>({ loadSelected, value: 'a', enabled: true })
    )
    await waitFor(() => expect(result.current.data).toEqual({ id: 'a', name: 'Кровля' }))
    rerender()
    expect(loadSelected).toHaveBeenCalledTimes(1)
  })

  it('L7: enabled: false (значение есть в выдаче или задан initialLabel) — не зовёт', () => {
    const loadSelected = vi.fn(async () => null)
    renderHook(() => useSelectedLoader<Category>({ loadSelected, value: 'a', enabled: false }))
    expect(loadSelected).not.toHaveBeenCalled()
  })

  it('L7: пустое значение — не зовёт', () => {
    const loadSelected = vi.fn(async () => null)
    renderHook(() => useSelectedLoader<Category>({ loadSelected, value: '', enabled: true }))
    expect(loadSelected).not.toHaveBeenCalled()
  })

  it('L7: после invalidate — зовёт снова, прежняя запись остаётся до ответа', async () => {
    let name = 'Кровля'
    const second = deferred<Category | null>()
    const loadSelected = vi.fn((value: string) =>
      name === 'Кровля' ? Promise.resolve({ id: value, name }) : second.promise
    )
    const { result } = renderHook(() => useSelectedLoader<Category>({ loadSelected, value: 'a', enabled: true }))
    await waitFor(() => expect(result.current.data?.name).toBe('Кровля'))

    name = 'Фасад'
    act(() => result.current.invalidate('a'))
    await waitFor(() => expect(loadSelected).toHaveBeenCalledTimes(2))
    expect(result.current.data?.name).toBe('Кровля')
    await act(async () => {
      second.resolve({ id: 'a', name: 'Фасад' })
      await second.promise
    })
    expect(result.current.data?.name).toBe('Фасад')
  })

  it('размонтирование отменяет запрос', () => {
    let signal!: AbortSignal
    const loadSelected = vi.fn((_value: string, ctx: { signal: AbortSignal }) => {
      signal = ctx.signal
      return new Promise<Category | null>(() => undefined)
    })
    const { unmount } = renderHook(() => useSelectedLoader<Category>({ loadSelected, value: 'a', enabled: true }))
    unmount()
    expect(signal.aborted).toBe(true)
  })
})

describe('useOptionsLoader', () => {
  it('L8: загрузка → options и loading: false; до ответа — loading: true и пустой список', async () => {
    const { result } = renderHook(() => useOptionsLoader(async () => [{ value: 'a', label: 'Кровля' }], []))
    expect(result.current.fieldProps).toEqual({ options: [], loading: true })
    await waitFor(() => expect(result.current.fieldProps.loading).toBe(false))
    expect(result.current.fieldProps.options).toEqual([{ value: 'a', label: 'Кровля' }])
  })

  it('L8: смена deps отменяет прошлую загрузку и зовёт загрузчик заново', async () => {
    const signals: AbortSignal[] = []
    const load = vi.fn(async ({ signal }: { signal: AbortSignal }) => {
      signals.push(signal)
      return []
    })
    const { rerender, result } = renderHook(({ dep }) => useOptionsLoader(load, [dep]), {
      initialProps: { dep: 1 },
    })
    rerender({ dep: 2 })
    await waitFor(() => expect(result.current.fieldProps.loading).toBe(false))
    expect(load).toHaveBeenCalledTimes(2)
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)
  })

  it('L8: reload зовёт загрузчик с теми же deps', async () => {
    const load = vi.fn(async () => [{ value: 'a', label: 'A' }])
    const { result } = renderHook(() => useOptionsLoader(load, []))
    await waitFor(() => expect(result.current.fieldProps.loading).toBe(false))
    act(() => result.current.reload())
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  })

  it('ошибка — в error, options прежние; reload повторяет', async () => {
    let fail = true
    const load = vi.fn(async () => {
      if (fail) {
        throw new Error('сеть')
      }
      return [{ value: 'a', label: 'A' }]
    })
    const { result } = renderHook(() => useOptionsLoader(load, []))
    await waitFor(() => expect((result.current.error as Error | null)?.message).toBe('сеть'))
    expect(result.current.fieldProps.loading).toBe(false)
    fail = false
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.fieldProps.options).toHaveLength(1))
    expect(result.current.error).toBeNull()
  })

  it('размонтирование отменяет загрузку', () => {
    let signal!: AbortSignal
    const load = vi.fn(({ signal: s }: { signal: AbortSignal }) => {
      signal = s
      return new Promise<never[]>(() => undefined)
    })
    const { unmount } = renderHook(() => useOptionsLoader(load, []))
    unmount()
    expect(signal.aborted).toBe(true)
  })
})
