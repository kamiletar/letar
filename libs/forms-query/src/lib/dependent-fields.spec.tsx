import type { FieldDeps } from '@letar/forms-core/uikit'
import { keepPreviousData, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fromSearchQuery, type SearchQueryOptions } from './from-search-query'
import { fromSelectedQuery, type SelectedQueryOptions } from './from-selected-query'
import { useInvalidateAfter } from './use-invalidate-after'
import { useLoaderQuery } from './use-loader-query'

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

interface City {
  id: string
  name: string
}

describe('fromSearchQuery / fromSelectedQuery — deps (QD1)', () => {
  it('хук поиска получает deps третьим аргументом; enabled = minChars и готовность deps', () => {
    const useHook = vi.fn((_s: string, _o: SearchQueryOptions, _d: FieldDeps) => ({ data: [] as City[] }))
    const useSearch = fromSearchQuery<City, { data: City[] }>(useHook, { minChars: 1 })

    useSearch('м', { countryId: 'RU' })
    useSearch('м', { countryId: '' })
    useSearch('', { countryId: 'RU' })

    expect(useHook).toHaveBeenNthCalledWith(1, 'м', { enabled: true, placeholderData: keepPreviousData }, {
      countryId: 'RU',
    })
    // Родитель пуст — запрос не уходит, хотя строка поиска проходит minChars
    expect(useHook).toHaveBeenNthCalledWith(2, 'м', { enabled: false, placeholderData: keepPreviousData }, {
      countryId: '',
    })
    expect(useHook).toHaveBeenNthCalledWith(3, '', { enabled: false, placeholderData: keepPreviousData }, {
      countryId: 'RU',
    })
  })

  it('0 и false в deps — значения, а не «пусто»', () => {
    const useHook = vi.fn((_s: string, _o: SearchQueryOptions, _d: FieldDeps) => ({ data: [] as City[] }))
    const useSearch = fromSearchQuery<City, { data: City[] }>(useHook)
    useSearch('а', { level: 0, flag: false })
    expect(useHook).toHaveBeenCalledWith('а', expect.objectContaining({ enabled: true }), { level: 0, flag: false })
  })

  it('своя depsReady из настроек заменяет правило по умолчанию', () => {
    const useHook = vi.fn((_s: string, _o: SearchQueryOptions, _d: FieldDeps) => ({ data: [] as City[] }))
    const useSearch = fromSearchQuery<City, { data: City[] }>(useHook, {
      depsReady: (deps) => deps['countryId'] !== undefined,
    })
    useSearch('а', { countryId: '' })
    expect(useHook).toHaveBeenCalledWith('а', expect.objectContaining({ enabled: true }), { countryId: '' })
  })

  it('без deps (поле без dependsOn) хук получает пустой объект, enabled — только по minChars', () => {
    const useHook = vi.fn((_s: string, _o: SearchQueryOptions, _d: FieldDeps) => ({ data: [] as City[] }))
    fromSearchQuery<City, { data: City[] }>(useHook)('а')
    expect(useHook).toHaveBeenCalledWith('а', expect.objectContaining({ enabled: true }), {})
  })

  it('fromSelectedQuery: deps третьим аргументом, enabled — значение непустое и deps готовы', () => {
    const useHook = vi.fn((_v: string, _o: SelectedQueryOptions, _d: FieldDeps) => ({ data: null }))
    const useSelected = fromSelectedQuery<City, { data: null }>(useHook)

    useSelected('c1', { countryId: 'RU' })
    useSelected('c1', { countryId: '' })
    useSelected('', { countryId: 'RU' })

    expect(useHook).toHaveBeenNthCalledWith(1, 'c1', { enabled: true }, { countryId: 'RU' })
    expect(useHook).toHaveBeenNthCalledWith(2, 'c1', { enabled: false }, { countryId: '' })
    expect(useHook).toHaveBeenNthCalledWith(3, '', { enabled: false }, { countryId: 'RU' })
  })

  it('fromSelectedQuery: своя depsReady из настроек', () => {
    const useHook = vi.fn((_v: string, _o: SelectedQueryOptions, _d: FieldDeps) => ({ data: null }))
    fromSelectedQuery<City, { data: null }>(useHook, { depsReady: () => true })('c1', { countryId: '' })
    expect(useHook).toHaveBeenCalledWith('c1', { enabled: true }, { countryId: '' })
  })
})

describe('useLoaderQuery — deps (QD2)', () => {
  it('ключ [...key, deps, search], загрузчик получает { signal, deps }; смена deps — новый запрос, возврат — кэш', async () => {
    const { wrapper, client } = createWrapper()
    const load = vi.fn(async (_search: string, ctx: { signal: AbortSignal; deps: FieldDeps }) => [
      { id: String(ctx.deps['countryId']), name: 'город' },
    ])
    const { result, rerender } = renderHook(
      ({ countryId }: { countryId: string }) => useLoaderQuery(['cities'], load)('м', { countryId }),
      { wrapper, initialProps: { countryId: 'RU' } },
    )
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'RU', name: 'город' }]))
    expect(load).toHaveBeenCalledWith('м', {
      signal: expect.any(AbortSignal),
      deps: { countryId: 'RU' },
    })
    expect(client.getQueryData(['cities', { countryId: 'RU' }, 'м'])).toEqual([{ id: 'RU', name: 'город' }])

    rerender({ countryId: 'FR' })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'FR', name: 'город' }]))
    expect(load).toHaveBeenCalledTimes(2)

    // Возврат к прежним deps — из кэша, без третьего запроса
    rerender({ countryId: 'RU' })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'RU', name: 'город' }]))
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('пока родитель пуст — запрос не уходит', async () => {
    const { wrapper } = createWrapper()
    const load = vi.fn(async () => [] as City[])
    renderHook(() => useLoaderQuery(['cities'], load)('м', { countryId: '' }), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(load).not.toHaveBeenCalled()
  })

  it('своя depsReady в настройках', async () => {
    const { wrapper } = createWrapper()
    const load = vi.fn(async () => [] as City[])
    renderHook(
      () => useLoaderQuery(['cities'], load, { depsReady: () => true })('м', { countryId: '' }),
      { wrapper },
    )
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1))
  })

  it('без deps (поле без dependsOn): deps — пустой объект, поведение прежнее', async () => {
    const { wrapper } = createWrapper()
    const load = vi.fn(async () => [] as City[])
    renderHook(() => useLoaderQuery(['cities'], load)('м'), { wrapper })
    await waitFor(() => expect(load).toHaveBeenCalledWith('м', { signal: expect.any(AbortSignal), deps: {} }))
  })
})

describe('useInvalidateAfter — форма-функция (QD3)', () => {
  it('инвалидирует только ключ родителя из ctx.deps', async () => {
    const { wrapper } = createWrapper()
    const fetchA = vi.fn(async () => ['a'])
    const fetchB = vi.fn(async () => ['b'])
    const { result } = renderHook(
      () => ({
        a: useQuery({ queryKey: ['employees', 'company-a'], queryFn: fetchA }),
        b: useQuery({ queryKey: ['employees', 'company-b'], queryFn: fetchB }),
        invalidateAfter: useInvalidateAfter((ctx) => [['employees', ctx.deps['companyId']]]),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.a.data).toEqual(['a']))
    await waitFor(() => expect(result.current.b.data).toEqual(['b']))

    const onCreate = result.current.invalidateAfter(
      async (_search: string, _ctx: { deps: FieldDeps }) => ({ label: 'x', value: 'x' }),
    )
    await onCreate('x', { deps: { companyId: 'company-a' } })

    expect(fetchA).toHaveBeenCalledTimes(2)
    expect(fetchB).toHaveBeenCalledTimes(1)
  })

  it('отказ пользователя (null) — функция ключей не вызывается', async () => {
    const { wrapper } = createWrapper()
    const keys = vi.fn((_ctx: { deps: FieldDeps }) => [['employees']])
    const { result } = renderHook(() => useInvalidateAfter(keys), { wrapper })
    const onCreate = result.current(async (_search: string, _ctx: { deps: FieldDeps }) => null)
    expect(await onCreate('x', { deps: { companyId: 'a' } })).toBeNull()
    expect(keys).not.toHaveBeenCalled()
  })

  it('обработчик вызван без ctx — deps пустой объект', async () => {
    const { wrapper } = createWrapper()
    const keys = vi.fn((_ctx: { deps: FieldDeps }) => [['employees']])
    const { result } = renderHook(() => useInvalidateAfter(keys), { wrapper })
    const onCreate = result.current(async (_name: string) => ({ label: 'x', value: 'x' }))
    await onCreate('x')
    expect(keys).toHaveBeenCalledWith({ deps: {} })
  })

  it('массив ключей работает как раньше', async () => {
    const { wrapper, client } = createWrapper()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useInvalidateAfter([['cats']]), { wrapper })
    await result.current(async (_name: string) => ({ label: 'x', value: 'x' }))('x')
    expect(spy).toHaveBeenCalledWith({ queryKey: ['cats'] })
  })
})

/**
 * QD4 — compile-only: хуки со старой сигнатурой (без третьего аргумента `deps`) принимаются адаптерами.
 */
describe('совместимость старых хуков (QD4)', () => {
  it('(search, options) и (value, options) компилируются', () => {
    const oldSearch = (_search: string, _options: SearchQueryOptions) => ({ data: [] as City[] })
    const oldSelected = (_value: string, _options: SelectedQueryOptions) => ({ data: null as City | null })
    const useSearch = fromSearchQuery<City, { data: City[] }>(oldSearch)
    const useSelected = fromSelectedQuery<City, { data: City | null }>(oldSelected)
    // Вызов без deps и с deps — оба валидны
    const typedSearch: (search: string, deps?: FieldDeps) => { data: City[] } = useSearch
    const typedSelected: (value: string, deps?: FieldDeps) => { data: City | null } = useSelected
    expect(typedSearch).toBeTypeOf('function')
    expect(typedSelected).toBeTypeOf('function')
  })
})
