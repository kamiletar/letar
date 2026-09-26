import { createPendingRegistry } from '@letar/forms-core/uikit'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSelectionActionsState, type UseSelectionActionsStateOptions } from './use-selection-actions-state'

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const appOptions = [{ value: 'a', label: 'Старое' }]

function setup(extra: Partial<UseSelectionActionsStateOptions> = {}) {
  const registry = createPendingRegistry()
  const hook = renderHook(
    (props: { value?: string | null }) =>
      useSelectionActionsState({ appOptions, registry, value: props.value ?? null, ...extra }),
    { initialProps: { value: null as string | null } },
  )
  return { ...hook, registry }
}

type Created = { label: string; value: string | number }

describe('оптимистичный режим useSelectionActionsState (O1–O6, O9, O12)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('O1 create: после optimistic pending снят, временная опция и ожидающий выбор есть, реестр ждёт', async () => {
    const { result, registry } = setup()
    const server = deferred<Created | null>()
    const apply = vi.fn()

    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'create',
        call: async (ctx) => {
          ctx.optimistic({ label: 'Кровля' })
          return server.promise
        },
        apply,
      })
    )
    await act(async () => {})

    expect(result.current.pending).toBe(false)
    expect(result.current.createdOptions).toEqual([
      expect.objectContaining({ label: 'Кровля', pending: true, value: expect.stringMatching(/^__letar_pending_/) }),
    ])
    expect(result.current.pendingSelection).toBe(result.current.createdOptions[0].value)
    expect(result.current.hasOwnCreatePending).toBe(true)
    expect(registry.getSnapshot().count).toBe(1)
    expect(apply).not.toHaveBeenCalled()

    await act(async () => server.resolve({ label: 'Кровля', value: 'r1' }))

    expect(apply).toHaveBeenCalledWith({ label: 'Кровля', value: 'r1' }, { optimistic: true, selectionHeld: true })
    expect(result.current.createdOptions).toEqual([])
    expect(result.current.pendingSelection).toBeNull()
    expect(registry.getSnapshot().count).toBe(0)
  })

  it('O2 edit: наложение pending сразу, после подтверждения — apply без pending', async () => {
    const { result } = setup()
    const server = deferred<Created | null>()
    const apply = vi.fn()
    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'edit',
        fromValue: 'a',
        call: async (ctx) => {
          ctx.optimistic({ label: 'Новое' })
          return server.promise
        },
        apply,
      })
    )
    await act(async () => {})
    expect(result.current.overlay).toEqual([
      expect.objectContaining({ fromValue: 'a', label: 'Новое', value: 'a', pending: true }),
    ])

    await act(async () => server.resolve({ label: 'Новое', value: 'a' }))
    expect(result.current.overlay).toEqual([])
    expect(apply).toHaveBeenCalledWith({ label: 'Новое', value: 'a' }, { optimistic: true, selectionHeld: false })
  })

  it.each(
    [
      ['declined', () => Promise.resolve(null), 'declined'],
      ['rejected', () => Promise.reject(new Error('boom')), 'rejected'],
    ] as const,
  )('O3 отказ (%s): откат, onSettleError с причиной, реестр даёт false', async (_name, outcome, reason) => {
    const onSettleError = vi.fn()
    const { result, registry } = setup({ onSettleError })
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'create',
        call: async (ctx) => {
          ctx.optimistic({ label: 'Кровля' })
          return outcome()
        },
        apply: vi.fn(),
      })
    )
    const settled = registry.settleAll()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    process.off('unhandledRejection', unhandled)

    expect(await settled).toBe(false)
    expect(unhandled).not.toHaveBeenCalled()
    expect(result.current.createdOptions).toEqual([])
    expect(result.current.pendingSelection).toBeNull()
    expect(onSettleError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'create', reason, preview: expect.objectContaining({ label: 'Кровля' }) }),
    )
    expect(result.current.settleFailure).toBeNull() // есть onSettleError — встроенного сообщения нет
  })

  it('O3 таймаут: settleTimeout → reason timeout, поздний ответ игнорируется', async () => {
    vi.useFakeTimers()
    const onSettleError = vi.fn()
    const { result } = setup({ onSettleError, settleTimeout: 1000 })
    const server = deferred<Created | null>()
    const apply = vi.fn()
    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'create',
        call: async (ctx) => {
          ctx.optimistic({ label: 'Кровля' })
          return server.promise
        },
        apply,
      })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1001)
    })
    expect(onSettleError).toHaveBeenCalledWith(expect.objectContaining({ reason: 'timeout' }))
    expect(result.current.createdOptions).toEqual([])

    await act(async () => server.resolve({ label: 'Кровля', value: 'r1' }))
    expect(apply).not.toHaveBeenCalled()
  })

  it('O3 без onSettleError: встроенное сообщение, исчезает при следующем действии', async () => {
    const { result } = setup()
    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'create',
        call: async (ctx) => {
          ctx.optimistic({ label: 'Кровля' })
          return null
        },
        apply: vi.fn(),
      })
    )
    await act(async () => {})
    expect(result.current.settleFailure).toEqual({ label: 'Кровля' })

    act(() =>
      result.current.run({ scope: 'option', kind: 'create', call: () => new Promise(() => undefined), apply: vi.fn() })
    )
    expect(result.current.settleFailure).toBeNull()
  })

  it('O4 пока create ждёт, значение формы изменилось → выбор снят, apply без selectionHeld', async () => {
    const { result, rerender } = setup()
    const server = deferred<Created | null>()
    const apply = vi.fn()
    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'create',
        call: async (ctx) => {
          ctx.optimistic({ label: 'Кровля' })
          return server.promise
        },
        apply,
      })
    )
    await act(async () => {})
    expect(result.current.pendingSelection).not.toBeNull()

    rerender({ value: 'a' }) // пользователь выбрал другое (O4) или внешний reset/setFieldValue (O5)
    expect(result.current.pendingSelection).toBeNull()

    await act(async () => server.resolve({ label: 'Кровля', value: 'r1' }))
    expect(apply).toHaveBeenCalledWith({ label: 'Кровля', value: 'r1' }, { optimistic: true, selectionHeld: false })
  })

  it('O4 отказ после смены выбора: встроенного сообщения нет, onSettleError отдельно', async () => {
    const { result, rerender } = setup()
    const server = deferred<Created | null>()
    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'create',
        call: async (ctx) => {
          ctx.optimistic({ label: 'Кровля' })
          return server.promise
        },
        apply: vi.fn(),
      })
    )
    await act(async () => {})
    rerender({ value: 'a' })
    await act(async () => server.resolve(null))
    expect(result.current.settleFailure).toBeNull()
    expect(result.current.createdOptions).toEqual([])
  })

  it('O6 два create подряд: второй разрешён после optimistic первого, ожидающий выбор у последнего', async () => {
    const { result, registry } = setup()
    const first = deferred<Created | null>()
    const second = deferred<Created | null>()
    const apply = vi.fn()
    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'create',
        call: async (ctx) => {
          ctx.optimistic({ label: 'Один' })
          return first.promise
        },
        apply,
      })
    )
    await act(async () => {})
    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'create',
        call: async (ctx) => {
          ctx.optimistic({ label: 'Два' })
          return second.promise
        },
        apply,
      })
    )
    await act(async () => {})
    expect(registry.getSnapshot().count).toBe(2)
    const secondTemp = result.current.createdOptions.find((opt) => opt.label === 'Два')?.value
    expect(result.current.pendingSelection).toBe(secondTemp)

    await act(async () => first.resolve({ label: 'Один', value: 'r1' }))
    expect(apply).toHaveBeenLastCalledWith({ label: 'Один', value: 'r1' }, { optimistic: true, selectionHeld: false })
    await act(async () => second.resolve({ label: 'Два', value: 'r2' }))
    expect(apply).toHaveBeenLastCalledWith({ label: 'Два', value: 'r2' }, { optimistic: true, selectionHeld: true })
    expect(registry.getSnapshot().count).toBe(0)
  })

  it('O9 размонтирование поля: запись реестра снята без отказа, ответ игнорируется', async () => {
    const onSettleError = vi.fn()
    const { result, registry, unmount } = setup({ onSettleError })
    const server = deferred<Created | null>()
    const apply = vi.fn()
    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'create',
        call: async (ctx) => {
          ctx.optimistic({ label: 'Кровля' })
          return server.promise
        },
        apply,
      })
    )
    await act(async () => {})
    expect(registry.getSnapshot().count).toBe(1)

    unmount()
    expect(registry.getSnapshot().count).toBe(0)
    await expect(registry.settleAll()).resolves.toBe(true)
    await act(async () => server.resolve({ label: 'Кровля', value: 'r1' }))
    expect(apply).not.toHaveBeenCalled()
    expect(onSettleError).not.toHaveBeenCalled()
  })

  it('O12 optimistic дважды — действует последний; после резолва обработчика — игнор', async () => {
    const { result } = setup()
    const server = deferred<Created | null>()
    let lateCtx: { optimistic: (preview: { label: string }) => void } | undefined
    act(() =>
      result.current.run({
        scope: 'option',
        kind: 'create',
        call: async (ctx) => {
          lateCtx = ctx
          ctx.optimistic({ label: 'Черновик' })
          ctx.optimistic({ label: 'Итог' })
          return server.promise
        },
        apply: vi.fn(),
      })
    )
    await act(async () => {})
    expect(result.current.createdOptions).toHaveLength(1)
    expect(result.current.createdOptions[0].label).toBe('Итог')

    await act(async () => server.resolve({ label: 'Итог', value: 'r1' }))
    act(() => lateCtx?.optimistic({ label: 'Поздний' }))
    expect(result.current.createdOptions).toEqual([])
  })

  it('O12 обработчик без optimistic — поведение прежнее: pending держится, реестр пуст', async () => {
    const { result, registry } = setup()
    const server = deferred<Created | null>()
    const apply = vi.fn()
    act(() => result.current.run({ scope: 'option', kind: 'create', call: () => server.promise, apply }))
    expect(result.current.pending).toBe(true)
    expect(registry.getSnapshot().count).toBe(0)
    await act(async () => server.resolve({ label: 'X', value: 'x' }))
    expect(apply).toHaveBeenCalledWith({ label: 'X', value: 'x' }, { optimistic: false, selectionHeld: false })
  })
})
