import type { FieldDeps, LoadContext } from '@letar/forms-core/uikit'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOptionsLoader } from './use-options-loader'
import { usePromiseSearch } from './use-promise-search'
import { useSelectedLoader } from './use-selected-loader'

interface City {
  id: string
  name: string
}

describe('источники с deps (§18, DS12/DS16)', () => {
  it('usePromiseSearch: deps уходят в ctx; смена depsKey — новый запрос, города прежнего родителя скрыты', async () => {
    const signals: AbortSignal[] = []
    const seen: FieldDeps[] = []
    const loadOptions = vi.fn((_search: string, ctx: LoadContext) => {
      signals.push(ctx.signal)
      seen.push(ctx.deps)
      return Promise.resolve([{ id: String(ctx.deps.countryId), name: String(ctx.deps.countryId) }])
    })
    const { result, rerender } = renderHook(
      ({ countryId }) =>
        usePromiseSearch<City>({
          loadOptions,
          search: '',
          enabled: true,
          deps: { countryId },
          depsKey: JSON.stringify([countryId]),
        }),
      { initialProps: { countryId: 'RU' } },
    )
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'RU', name: 'RU' }]))
    rerender({ countryId: 'DE' })
    // Пока идёт запрос нового родителя, города прежнего не показываются
    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'DE', name: 'DE' }]))
    expect(seen.map((deps) => deps.countryId)).toEqual(['RU', 'DE'])
  })

  it('usePromiseSearch: A → B → C быстро — signal A и B отменены, применяется только C', async () => {
    const signals: AbortSignal[] = []
    const loadOptions = vi.fn((_search: string, ctx: LoadContext) => {
      signals.push(ctx.signal)
      return Promise.resolve([{ id: String(ctx.deps.p), name: 'x' }])
    })
    const { result, rerender } = renderHook(
      ({ p }) => usePromiseSearch<City>({ loadOptions, search: '', enabled: true, deps: { p }, depsKey: p }),
      { initialProps: { p: 'A' } },
    )
    rerender({ p: 'B' })
    rerender({ p: 'C' })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'C', name: 'x' }]))
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(true)
    expect(signals[2]!.aborted).toBe(false)
  })

  it('usePromiseSearch: загрузчик игнорирует signal — ответ B после C не применяется', async () => {
    const resolvers: Record<string, (data: City[]) => void> = {}
    const loadOptions = vi.fn(
      (_search: string, ctx: LoadContext) =>
        new Promise<City[]>((resolve) => {
          resolvers[String(ctx.deps.p)] = resolve
        }),
    )
    const { result, rerender } = renderHook(
      ({ p }) => usePromiseSearch<City>({ loadOptions, search: '', enabled: true, deps: { p }, depsKey: p }),
      { initialProps: { p: 'B' } },
    )
    rerender({ p: 'C' })
    await act(async () => {
      resolvers.C!([{ id: 'c', name: 'C' }])
    })
    await act(async () => {
      resolvers.B!([{ id: 'b', name: 'B' }])
    })
    expect(result.current.data).toEqual([{ id: 'c', name: 'C' }])
  })

  it('useSelectedLoader: deps уходят в ctx', async () => {
    const seen: FieldDeps[] = []
    const loadSelected = vi.fn((value: string, ctx: LoadContext) => {
      seen.push(ctx.deps)
      return Promise.resolve({ id: value, name: value })
    })
    const { result } = renderHook(() =>
      useSelectedLoader<City>({ loadSelected, value: 'msk', enabled: true, deps: { countryId: 'RU' } })
    )
    await waitFor(() => expect(result.current.data).toEqual({ id: 'msk', name: 'msk' }))
    expect(seen).toEqual([{ countryId: 'RU' }])
  })

  it('useOptionsLoader: keepPrevious=false — при смене deps прежние опции скрыты, на reload остаются', async () => {
    const load = vi.fn((ctx: LoadContext) => Promise.resolve([{ value: String(ctx.deps.p) }]))
    const { result, rerender } = renderHook(
      ({ p }) => useOptionsLoader(load, [p], { keepPrevious: false, fieldDeps: { p } }),
      { initialProps: { p: 'A' } },
    )
    await waitFor(() => expect(result.current.fieldProps.options).toEqual([{ value: 'A' }]))
    rerender({ p: 'B' })
    expect(result.current.fieldProps.options).toEqual([])
    expect(result.current.fieldProps.loading).toBe(true)
    await waitFor(() => expect(result.current.fieldProps.options).toEqual([{ value: 'B' }]))
    act(() => result.current.reload())
    expect(result.current.fieldProps.options).toEqual([{ value: 'B' }])
    expect(result.current.fieldProps.loading).toBe(true)
    await waitFor(() => expect(result.current.fieldProps.loading).toBe(false))
  })

  it('useOptionsLoader: по умолчанию (keepPrevious=true) прежние опции остаются, как раньше', async () => {
    const load = vi.fn((ctx: LoadContext) => Promise.resolve([{ value: String(ctx.deps.p ?? 'none') }]))
    const { result, rerender } = renderHook(({ p }) => useOptionsLoader(load, [p], { fieldDeps: { p } }), {
      initialProps: { p: 'A' },
    })
    await waitFor(() => expect(result.current.fieldProps.options).toEqual([{ value: 'A' }]))
    rerender({ p: 'B' })
    expect(result.current.fieldProps.options).toEqual([{ value: 'A' }])
  })
})
