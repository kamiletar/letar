import { describe, expect, it, vi } from 'vitest'
import { triggerUndoableAction } from './undo-toast'

function createMockToaster() {
  return { create: vi.fn() }
}

describe('triggerUndoableAction', () => {
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
