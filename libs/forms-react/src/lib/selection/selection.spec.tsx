import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type SelectionActionsContextValue,
  SelectionActionsProvider,
  type SelectionOptionContextValue,
  SelectionOptionProvider,
} from './selection-context'
import { useSelectionActionsState } from './use-selection-actions-state'
import { resetSelectionButtonWarnings, useSelectionCreateButton, useSelectionEditButton } from './use-selection-buttons'
import { useSelectionSearch } from './use-selection-search'

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useSelectionActionsState', () => {
  const appOptions = [{ value: 'a', label: 'Старое' }]

  it('run: закрывает список, из пункта возвращает фокус на триггер, зовёт обработчик синхронно', async () => {
    const { result } = renderHook(() => useSelectionActionsState({ appOptions }))
    const control = { close: vi.fn(), focusTrigger: vi.fn() }
    result.current.controlRef.current = control
    const call = vi.fn().mockResolvedValue({ label: 'X' })
    const apply = vi.fn()

    act(() => result.current.run({ scope: 'option', call, apply }))

    expect(control.close).toHaveBeenCalledTimes(1)
    expect(control.focusTrigger).toHaveBeenCalledTimes(1)
    expect(call).toHaveBeenCalledTimes(1)
    await act(async () => {})
    expect(apply).toHaveBeenCalledWith({ label: 'X' })
    expect(result.current.pending).toBe(false)
  })

  it('run из значения не переводит фокус на триггер', () => {
    const { result } = renderHook(() => useSelectionActionsState({ appOptions }))
    const control = { close: vi.fn(), focusTrigger: vi.fn() }
    result.current.controlRef.current = control

    act(() => result.current.run({ scope: 'value', call: () => new Promise(() => undefined), apply: vi.fn() }))

    expect(control.close).toHaveBeenCalled()
    expect(control.focusTrigger).not.toHaveBeenCalled()
  })

  it('пока действие идёт, повторный запуск игнорируется, pending виден', async () => {
    const { result } = renderHook(() => useSelectionActionsState({ appOptions }))
    const first = deferred<null>()
    const secondCall = vi.fn()

    act(() => result.current.run({ scope: 'value', call: () => first.promise, apply: vi.fn() }))
    expect(result.current.pending).toBe(true)
    act(() => result.current.run({ scope: 'value', call: secondCall, apply: vi.fn() }))
    expect(secondCall).not.toHaveBeenCalled()

    await act(async () => first.resolve(null))
    expect(result.current.pending).toBe(false)
  })

  it('null не применяется', async () => {
    const { result } = renderHook(() => useSelectionActionsState({ appOptions }))
    const apply = vi.fn()
    act(() => result.current.run({ scope: 'value', call: () => Promise.resolve(null), apply }))
    await act(async () => {})
    expect(apply).not.toHaveBeenCalled()
  })

  it('после размонтирования результат не применяется', async () => {
    const { result, unmount } = renderHook(() => useSelectionActionsState({ appOptions }))
    const pendingCall = deferred<{ label: string }>()
    const apply = vi.fn()
    act(() => result.current.run({ scope: 'value', call: () => pendingCall.promise, apply }))
    unmount()
    await act(async () => pendingCall.resolve({ label: 'X' }))
    expect(apply).not.toHaveBeenCalled()
  })

  it('reject не глотается, pending снимается и второй запуск работает', async () => {
    const { result } = renderHook(() => useSelectionActionsState({ appOptions }))
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    const failing = deferred<null>()
    act(() => result.current.run({ scope: 'value', call: () => failing.promise, apply: vi.fn() }))
    await act(async () => {
      failing.reject(new Error('boom'))
      await new Promise((r) => setTimeout(r, 10))
    })
    process.off('unhandledRejection', unhandled)

    expect(unhandled).toHaveBeenCalled()
    expect(result.current.pending).toBe(false)
    const second = vi.fn().mockResolvedValue(null)
    act(() => result.current.run({ scope: 'value', call: second, apply: vi.fn() }))
    expect(second).toHaveBeenCalled()
  })

  it('recordEdit опции приложения — наложение; запись держится при той же подписи приложения', () => {
    const { result, rerender } = renderHook(({ options }) => useSelectionActionsState({ appOptions: options }), {
      initialProps: { options: appOptions },
    })
    act(() => result.current.recordEdit('a', { label: 'Новое', value: 'a' }))
    expect(result.current.overlay).toHaveLength(1)

    rerender({ options: [{ value: 'a', label: 'Старое' }] })
    expect(result.current.overlay).toHaveLength(1)

    rerender({ options: [] })
    expect(result.current.overlay).toHaveLength(1)
  })

  it('свежая подпись от приложения сбрасывает наложение и запись не воскресает', () => {
    const { result, rerender } = renderHook(({ options }) => useSelectionActionsState({ appOptions: options }), {
      initialProps: { options: appOptions },
    })
    act(() => result.current.recordEdit('a', { label: 'Новое', value: 'a' }))

    rerender({ options: [{ value: 'a', label: 'Свежая' }] })
    expect(result.current.overlay).toHaveLength(0)

    rerender({ options: [{ value: 'a', label: 'Старое' }] })
    expect(result.current.overlay).toHaveLength(0)
  })

  it('recordEdit созданной опции правит запись в createdOptions, без наложения', () => {
    const { result } = renderHook(() => useSelectionActionsState({ appOptions }))
    act(() => result.current.addCreatedOption({ label: 'Создана', value: 'n1', data: { id: 1 } }))
    act(() => result.current.recordEdit('n1', { label: 'Переименована', value: 'n1' }))

    expect(result.current.overlay).toHaveLength(0)
    expect(result.current.createdOptions).toEqual([{ label: 'Переименована', value: 'n1', data: { id: 1 } }])
  })

  it('когда приложение отдало значение созданной опции, правка идёт наложением', () => {
    const { result } = renderHook(() =>
      useSelectionActionsState({ appOptions: [{ value: 'n1', label: 'Пришла из справочника' }] })
    )
    act(() => result.current.addCreatedOption({ label: 'Создана', value: 'n1' }))
    act(() => result.current.recordEdit('n1', { label: 'Новое', value: 'n1' }))
    expect(result.current.overlay).toHaveLength(1)
  })
})

describe('слоты-кнопки (headless)', () => {
  const actions = (patch: Partial<SelectionActionsContextValue> = {}): SelectionActionsContextValue => ({
    pending: false,
    canCreate: true,
    hasOnUpdate: true,
    interactive: true,
    search: '',
    runCreate: vi.fn(),
    runEdit: vi.fn(),
    strings: {
      edit: 'Изменить',
      editAria: (t) => `Изменить «${t}»`,
      create: '+ Добавить…',
      createWithSearch: (s) => `+ Добавить "${s}"`,
      hotkeyHint: 'F2',
    },
    ...patch,
  })
  const item = (patch: Partial<SelectionOptionContextValue> = {}): SelectionOptionContextValue => ({
    option: { value: 'a' },
    text: 'Кровля',
    editable: true,
    scope: 'option',
    ...patch,
  })
  const wrap =
    (a: SelectionActionsContextValue | null, o: SelectionOptionContextValue | null) =>
    ({ children }: { children: ReactNode }) => {
      const inner = o ? <SelectionOptionProvider value={o}>{children}</SelectionOptionProvider> : children
      return a ? <SelectionActionsProvider value={a}>{inner}</SelectionActionsProvider> : <>{inner}</>
    }

  beforeEach(() => {
    resetSelectionButtonWarnings()
    vi.restoreAllMocks()
  })

  it('EditButton в пункте: tabIndex -1, aria-hidden, гасит pointer/click и зовёт runEdit', () => {
    const a = actions()
    const { result } = renderHook(() => useSelectionEditButton({}), { wrapper: wrap(a, item()) })
    const state = result.current!
    expect(state.tabIndex).toBe(-1)
    expect(state['aria-hidden']).toBe(true)
    expect(state['aria-label']).toBe('Изменить «Кровля»')

    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() }
    state.onClick(event as never)
    state.onPointerUp(event as never)
    expect(event.stopPropagation).toHaveBeenCalledTimes(2)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(a.runEdit).toHaveBeenCalledWith({ value: 'a' }, 'option')
  })

  it('EditButton у значения: в Tab-порядке, без aria-hidden', () => {
    const { result } = renderHook(() => useSelectionEditButton({}), {
      wrapper: wrap(actions(), item({ scope: 'value' })),
    })
    expect(result.current!.tabIndex).toBeUndefined()
    expect(result.current!['aria-hidden']).toBeUndefined()
  })

  it('EditButton: null для нередактируемой, disabled/readOnly поля, без onUpdate', () => {
    const w = (a: SelectionActionsContextValue, o: SelectionOptionContextValue) => wrap(a, o)
    expect(
      renderHook(() => useSelectionEditButton({}), { wrapper: w(actions(), item({ editable: false })) }).result.current,
    )
      .toBeNull()
    expect(
      renderHook(() => useSelectionEditButton({}), { wrapper: w(actions({ interactive: false }), item()) }).result
        .current,
    ).toBeNull()
    expect(
      renderHook(() => useSelectionEditButton({}), { wrapper: w(actions({ hasOnUpdate: false }), item()) }).result
        .current,
    ).toBeNull()
  })

  it('EditButton pending — disabled', () => {
    const { result } = renderHook(() => useSelectionEditButton({}), {
      wrapper: wrap(actions({ pending: true }), item()),
    })
    expect(result.current!.disabled).toBe(true)
  })

  it('EditButton вне поля и внутри renderValue — null + одно предупреждение', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(renderHook(() => useSelectionEditButton({})).result.current).toBeNull()
    expect(
      renderHook(() => useSelectionEditButton({}), { wrapper: wrap(actions(), item({ scope: 'value-text' })) }).result
        .current,
    ).toBeNull()
    renderHook(() => useSelectionEditButton({}))
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('CreateButton: подпись по поиску, runCreate, гасит Enter/Space; null без onCreate', () => {
    const a = actions({ search: 'Нов' })
    const { result } = renderHook(() => useSelectionCreateButton(), { wrapper: wrap(a, null) })
    expect(result.current!.label).toBe('+ Добавить "Нов"')
    const keyEvent = { key: 'Enter', stopPropagation: vi.fn() }
    result.current!.onKeyDown(keyEvent as never)
    expect(keyEvent.stopPropagation).toHaveBeenCalled()
    result.current!.onClick({ stopPropagation: vi.fn(), preventDefault: vi.fn() } as never)
    expect(a.runCreate).toHaveBeenCalled()

    expect(
      renderHook(() => useSelectionCreateButton(), { wrapper: wrap(actions({ canCreate: false }), null) }).result
        .current,
    ).toBeNull()
  })
})

describe('useSelectionSearch', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ value: `v${i}`, label: i === 0 ? 'Кровля' : `Работа ${i}` }))
  const few = many.slice(0, 5)
  const getText = (o: { label: string }) => o.label
  const base = { getText, placeholder: 'Поиск…', ariaLabel: 'Поиск по списку' }

  it('до порога поиска нет, с 10-й опции — есть', () => {
    const nine = renderHook(() => useSelectionSearch({ ...base, searchable: 'auto', options: many.slice(0, 9) }))
    expect(nine.result.current.search).toBeUndefined()
    const ten = renderHook(() => useSelectionSearch({ ...base, searchable: 'auto', options: many.slice(0, 10) }))
    expect(ten.result.current.search?.placeholder).toBe('Поиск…')
    expect(ten.result.current.search?.ariaLabel).toBe('Поиск по списку')
  })

  it('фильтрует и отдаёт visibleValues; пустой запрос — всё', () => {
    const { result } = renderHook(() => useSelectionSearch({ ...base, searchable: true, options: few }))
    expect(result.current.filtered).toHaveLength(5)
    act(() => result.current.setQuery('кров'))
    expect(result.current.filtered.map((o) => o.value)).toEqual(['v0'])
    expect([...result.current.search!.visibleValues]).toEqual(['v0'])
    act(() => result.current.setQuery(''))
    expect(result.current.filtered).toHaveLength(5)
  })

  it('раскладка: «rhjdkz» находит «Кровля»', () => {
    const { result } = renderHook(() => useSelectionSearch({ ...base, searchable: true, options: few }))
    act(() => result.current.setQuery('rhjdkz'))
    expect(result.current.filtered.map((o) => o.value)).toEqual(['v0'])
  })

  it('гистерезис: опций стало меньше порога, но запрос непустой — поле остаётся', () => {
    const { result, rerender } = renderHook(
      ({ options }) => useSelectionSearch({ ...base, searchable: 'auto', options }),
      { initialProps: { options: many } },
    )
    act(() => result.current.setQuery('раб'))
    rerender({ options: few })
    expect(result.current.enabled).toBe(true)
    act(() => result.current.setQuery(''))
    expect(result.current.enabled).toBe(false)
  })

  it('searchable=false — поиска нет, запрос не фильтрует', () => {
    const { result } = renderHook(() => useSelectionSearch({ ...base, searchable: false, options: many }))
    expect(result.current.search).toBeUndefined()
    act(() => result.current.setQuery('кров'))
    expect(result.current.filtered).toHaveLength(12)
  })

  it('объект: свой placeholder и свой фильтр', () => {
    const { result } = renderHook(() =>
      useSelectionSearch({
        ...base,
        searchable: { threshold: 0, placeholder: 'Найти работу', filter: (o, q) => o.label === q },
        options: few,
      })
    )
    expect(result.current.search?.placeholder).toBe('Найти работу')
    act(() => result.current.setQuery('Работа 2'))
    expect(result.current.filtered.map((o) => o.value)).toEqual(['v2'])
  })
})
