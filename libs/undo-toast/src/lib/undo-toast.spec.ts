// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { triggerDeferredUndoableAction, triggerUndoableAction } from './undo-toast'

function createMockToaster() {
  return { create: vi.fn() }
}

describe('triggerUndoableAction (немедленный commit + реальная отмена)', () => {
  it('вызывает action немедленно, до любого клика', async () => {
    const toaster = createMockToaster()
    const action = vi.fn().mockResolvedValue(undefined)
    const undo = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerUndoableAction(toaster as any, { message: 'Удалено', action, undo }, { id: '1' })

    expect(action).toHaveBeenCalledWith({ id: '1' })
    expect(undo).not.toHaveBeenCalled()
  })

  it('показывает тост с заголовком и действием "Отменить" по умолчанию', () => {
    const toaster = createMockToaster()
    const action = vi.fn()
    const undo = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerUndoableAction(toaster as any, { message: 'Удалено', action, undo }, { id: '1' })

    expect(toaster.create).toHaveBeenCalledTimes(1)
    const call = toaster.create.mock.calls[0][0]
    expect(call.title).toBe('Удалено')
    expect(call.duration).toBe(5000)
    expect(call.action.label).toBe('Отменить')
  })

  it('строит заголовок из функции message с параметрами действия', () => {
    const toaster = createMockToaster()

    triggerUndoableAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toaster as any,
      {
        message: (vars: { name: string }) => `Удалено: ${vars.name}`,
        action: vi.fn(),
        undo: vi.fn(),
      },
      { name: 'Иванов' },
    )

    expect(toaster.create.mock.calls[0][0].title).toBe('Удалено: Иванов')
  })

  it('вызывает undo по клику на кнопку тоста', () => {
    const toaster = createMockToaster()
    const undo = vi.fn().mockResolvedValue(undefined)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerUndoableAction(toaster as any, { message: 'Удалено', action: vi.fn(), undo }, { id: '1' })

    const toastOptions = toaster.create.mock.calls[0][0]
    toastOptions.action.onClick()

    expect(undo).toHaveBeenCalledWith({ id: '1' })
  })

  it('уважает кастомные durationMs и undoLabel', () => {
    const toaster = createMockToaster()

    triggerUndoableAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toaster as any,
      { message: 'Архивировано', action: vi.fn(), undo: vi.fn(), durationMs: 8000, undoLabel: 'Вернуть' },
      {},
    )

    const toastOptions = toaster.create.mock.calls[0][0]
    expect(toastOptions.duration).toBe(8000)
    expect(toastOptions.action.label).toBe('Вернуть')
  })

  it('зовёт onError, если action упал', async () => {
    const toaster = createMockToaster()
    const onError = vi.fn()
    const error = new Error('boom')

    triggerUndoableAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toaster as any,
      { message: 'Удалено', action: () => Promise.reject(error), undo: vi.fn(), onError },
      { id: '1' },
    )

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(error, { id: '1' }))
  })

  it('зовёт onError, если undo упал', async () => {
    const toaster = createMockToaster()
    const onError = vi.fn()
    const error = new Error('undo-boom')

    triggerUndoableAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toaster as any,
      { message: 'Удалено', action: vi.fn(), undo: () => Promise.reject(error), onError },
      { id: '1' },
    )

    toaster.create.mock.calls[0][0].action.onClick()

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(error, { id: '1' }))
  })
})

describe('triggerDeferredUndoableAction (отложенный commit + pagehide-safety)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('не вызывает onCommit немедленно — только по истечении окна', () => {
    const toaster = createMockToaster()
    const onCommit = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerDeferredUndoableAction(toaster as any, { message: 'Удалено', onCommit, onUndo: vi.fn() }, { id: '1' })

    expect(onCommit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(onCommit).toHaveBeenCalledWith({ id: '1' })
  })

  it('показывает тост с заголовком и действием "Отменить" по умолчанию', () => {
    const toaster = createMockToaster()

    triggerDeferredUndoableAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toaster as any,
      { message: 'Удалено', onCommit: vi.fn(), onUndo: vi.fn() },
      { id: '1' },
    )

    expect(toaster.create).toHaveBeenCalledTimes(1)
    const call = toaster.create.mock.calls[0][0]
    expect(call.title).toBe('Удалено')
    expect(call.duration).toBe(5000)
    expect(call.action.label).toBe('Отменить')
  })

  it('строит заголовок из функции message с параметрами действия', () => {
    const toaster = createMockToaster()

    triggerDeferredUndoableAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toaster as any,
      {
        message: (vars: { name: string }) => `Удалено: ${vars.name}`,
        onCommit: vi.fn(),
        onUndo: vi.fn(),
      },
      { name: 'Иванов' },
    )

    expect(toaster.create.mock.calls[0][0].title).toBe('Удалено: Иванов')
  })

  it('клик "Отменить" вызывает onUndo и отменяет запланированный onCommit', () => {
    const toaster = createMockToaster()
    const onCommit = vi.fn()
    const onUndo = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerDeferredUndoableAction(toaster as any, { message: 'Удалено', onCommit, onUndo }, { id: '1' })

    toaster.create.mock.calls[0][0].action.onClick()
    vi.advanceTimersByTime(5000)

    expect(onUndo).toHaveBeenCalledWith({ id: '1' })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('уважает кастомные durationMs и undoLabel', () => {
    const toaster = createMockToaster()
    const onCommit = vi.fn()

    triggerDeferredUndoableAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toaster as any,
      { message: 'Архивировано', onCommit, onUndo: vi.fn(), durationMs: 8000, undoLabel: 'Вернуть' },
      {},
    )

    const toastOptions = toaster.create.mock.calls[0][0]
    expect(toastOptions.duration).toBe(8000)
    expect(toastOptions.action.label).toBe('Вернуть')

    vi.advanceTimersByTime(7999)
    expect(onCommit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onCommit).toHaveBeenCalled()
  })

  it('pagehide до истечения таймера немедленно коммитит onCommit — pagehide-safety', () => {
    const toaster = createMockToaster()
    const onCommit = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerDeferredUndoableAction(toaster as any, { message: 'Удалено', onCommit, onUndo: vi.fn() }, { id: '1' })

    expect(onCommit).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('pagehide'))
    expect(onCommit).toHaveBeenCalledWith({ id: '1' })

    // повторный сигнал (таймер долетает позже, либо beforeunload следом) не коммитит дважды
    vi.advanceTimersByTime(5000)
    window.dispatchEvent(new Event('beforeunload'))
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('beforeunload тоже флашит onCommit — вторая подстраховка, не только pagehide', () => {
    const toaster = createMockToaster()
    const onCommit = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerDeferredUndoableAction(toaster as any, { message: 'Удалено', onCommit, onUndo: vi.fn() }, { id: '1' })

    window.dispatchEvent(new Event('beforeunload'))
    expect(onCommit).toHaveBeenCalledWith({ id: '1' })
  })

  it('клик "Отменить" после pagehide не вызывает onUndo — onCommit уже settled', () => {
    const toaster = createMockToaster()
    const onCommit = vi.fn()
    const onUndo = vi.fn()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerDeferredUndoableAction(toaster as any, { message: 'Удалено', onCommit, onUndo }, { id: '1' })

    window.dispatchEvent(new Event('pagehide'))
    toaster.create.mock.calls[0][0].action.onClick()

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('зовёт onError, если onCommit упал', async () => {
    vi.useRealTimers()
    const toaster = createMockToaster()
    const onError = vi.fn()
    const error = new Error('boom')

    triggerDeferredUndoableAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toaster as any,
      { message: 'Удалено', onCommit: () => Promise.reject(error), onUndo: vi.fn(), onError, durationMs: 1 },
      { id: '1' },
    )

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(error, { id: '1' }))
  })

  it('зовёт onError, если onUndo упал', async () => {
    vi.useRealTimers()
    const toaster = createMockToaster()
    const onError = vi.fn()
    const error = new Error('undo-boom')

    triggerDeferredUndoableAction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toaster as any,
      { message: 'Удалено', onCommit: vi.fn(), onUndo: () => Promise.reject(error), onError },
      { id: '1' },
    )

    toaster.create.mock.calls[0][0].action.onClick()

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(error, { id: '1' }))
  })
})
