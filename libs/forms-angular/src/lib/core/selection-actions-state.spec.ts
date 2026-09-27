import { provideZonelessChangeDetection, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSelectionActionsState, type SelectionActionsState } from './selection-actions-state'

interface AppOption {
  value: string | number
  label?: unknown
  textValue?: string
}

function createState(options: Parameters<typeof createSelectionActionsState>[0]): SelectionActionsState {
  return TestBed.runInInjectionContext(() => createSelectionActionsState(options))
}

describe('createSelectionActionsState', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
  })

  it('starts idle with no created options and no overlay', () => {
    const state = createState({ appOptions: () => [] })
    expect(state.pending()).toBe(false)
    expect(state.createdOptions()).toEqual([])
    expect(state.overlay()).toEqual([])
    expect(state.pendingSelection()).toBeNull()
  })

  it('run() with a plain (non-optimistic) create adds the option via apply()', async () => {
    const apply = vi.fn()
    const state = createState({ appOptions: () => [] })
    state.run({ scope: 'option', call: async () => ({ label: 'Создано', value: 'new-1' }), apply })
    expect(state.pending()).toBe(true)
    await vi.waitFor(() => expect(state.pending()).toBe(false))
    expect(apply).toHaveBeenCalledWith({ label: 'Создано', value: 'new-1' }, {
      optimistic: false,
      selectionHeld: false,
    })
  })

  it('run() ignores a second call while the first is still pending', () => {
    let resolveFirst: (value: { label: string; value: string } | null) => void = () => undefined
    const state = createState({ appOptions: () => [] })
    const call = vi.fn(() =>
      new Promise<{ label: string; value: string } | null>((resolve) => (resolveFirst = resolve))
    )
    state.run({ scope: 'option', call, apply: vi.fn() })
    state.run({ scope: 'option', call, apply: vi.fn() })
    expect(call).toHaveBeenCalledTimes(1)
    resolveFirst(null)
  })

  it('optimistic create shows a pending option immediately and confirms it via the registry', async () => {
    const registry = {
      add: vi.fn((promise: Promise<boolean>) => {
        void promise
        return () => undefined
      }),
      subscribe: vi.fn(() => () => undefined),
      getSnapshot: vi.fn(() => ({ count: 0, submitQueued: false })),
      settleAll: vi.fn(async () => true),
      submitWhenSettled: vi.fn(async () => undefined),
    }
    let resolveCall: (value: { label: string; value: string } | null) => void = () => undefined
    const state = createState({ appOptions: () => [], registry })

    state.run({
      scope: 'option',
      call: (ctx) => {
        ctx.optimistic({ label: 'Черновик' })
        return new Promise((resolve) => (resolveCall = resolve))
      },
      apply: vi.fn(),
    })

    expect(state.pending()).toBe(false)
    expect(state.createdOptions()).toHaveLength(1)
    expect(state.createdOptions()[0]).toMatchObject({ label: 'Черновик', pending: true })
    expect(state.pendingSelection()).toBe(state.createdOptions()[0]?.value)

    resolveCall({ label: 'Черновик', value: 'srv-1' })
    await vi.waitFor(() => expect(state.createdOptions()).toHaveLength(0))
    expect(state.pendingSelection()).toBeNull()
  })

  it('a declined optimistic create reverts the preview and sets settleFailure', async () => {
    let resolveCall: (value: { label: string; value: string } | null) => void = () => undefined
    const onRevert = vi.fn()
    const state = createState({ appOptions: () => [] })

    state.run({
      scope: 'option',
      call: (ctx) => {
        ctx.optimistic({ label: 'Черновик' })
        return new Promise((resolve) => (resolveCall = resolve))
      },
      apply: vi.fn(),
      onRevert,
    })

    resolveCall(null)
    await vi.waitFor(() => expect(state.createdOptions()).toHaveLength(0))
    expect(onRevert).toHaveBeenCalled()
    expect(state.settleFailure()).toEqual({ label: 'Черновик' })
  })

  it('recordEdit() overlays an app option and pruneOptionOverlay drops it once appOptions catch up', () => {
    // `appOptions`/`depsKey` — настоящие сигналы: `computed()` в Angular мемоизирует строго по сигналам,
    // прочитанным внутри, а не по факту вызова геттера — обычная замыкающая переменная не инвалидировала бы кеш
    const appOptions = signal<AppOption[]>([{ value: 'a', label: 'A' }])
    const state = createState({ appOptions: () => appOptions() })
    state.recordEdit('a', { label: 'A2', value: 'a' })
    expect(state.overlay()).toHaveLength(1)
    expect(state.overlay()[0]).toMatchObject({ label: 'A2', fromValue: 'a' })

    appOptions.set([{ value: 'a', label: 'A2' }])
    expect(state.overlay()).toHaveLength(0)
  })

  it('resets createdOptions/overlay when depsKey changes (dependsOn parent switched)', () => {
    const depsKey = signal('ru')
    const state = createState({ appOptions: () => [], depsKey: () => depsKey() })
    state.addCreatedOption({ label: 'Москва', value: 'msk' })
    expect(state.createdOptions()).toHaveLength(1)

    depsKey.set('us')
    expect(state.createdOptions()).toHaveLength(0)
  })
})
