// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { actionFailure } from '@letar/forms-core/server-errors'

import { useDeleteWithUndoRedirect } from './use-delete-with-undo-redirect'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

function createMockToaster() {
  return { create: vi.fn() }
}

describe('useDeleteWithUndoRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('без id — no-op: ни редиректа, ни тоста', () => {
    const toaster = createMockToaster()
    const deleteAction = vi.fn()

    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useDeleteWithUndoRedirect({
        toaster: toaster as any,
        id: undefined,
        redirectTo: '/admin/vacancies/',
        message: 'Вакансия удалена',
        errorTitle: 'Не удалось удалить вакансию',
        deleteAction,
      })
    )

    result.current()

    expect(mockPush).not.toHaveBeenCalled()
    expect(toaster.create).not.toHaveBeenCalled()
    expect(deleteAction).not.toHaveBeenCalled()
  })

  it('с id — редирект СРАЗУ, до коммита, затем тост с отложенным onCommit', () => {
    const toaster = createMockToaster()
    const deleteAction = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useDeleteWithUndoRedirect({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toaster: toaster as any,
        id: 'vac-1',
        redirectTo: '/admin/vacancies/',
        message: 'Вакансия удалена',
        errorTitle: 'Не удалось удалить вакансию',
        deleteAction,
      })
    )

    result.current()

    expect(mockPush).toHaveBeenCalledWith('/admin/vacancies/')
    expect(deleteAction).not.toHaveBeenCalled()

    vi.advanceTimersByTime(5000)
    expect(deleteAction).toHaveBeenCalledWith('vac-1')
  })

  it('клик "Отменить" отменяет onCommit — deleteAction не вызывается вовсе', () => {
    const toaster = createMockToaster()
    const deleteAction = vi.fn()

    const { result } = renderHook(() =>
      useDeleteWithUndoRedirect({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toaster: toaster as any,
        id: 'vac-1',
        redirectTo: '/admin/vacancies/',
        message: 'Вакансия удалена',
        errorTitle: 'Не удалось удалить вакансию',
        deleteAction,
      })
    )

    result.current()
    toaster.create.mock.calls[0][0].action.onClick()
    vi.advanceTimersByTime(5000)

    expect(deleteAction).not.toHaveBeenCalled()
  })

  it('ошибка deleteAction показывает errorTitle отдельным тостом', async () => {
    const toaster = createMockToaster()
    const deleteAction = vi.fn().mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() =>
      useDeleteWithUndoRedirect({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toaster: toaster as any,
        id: 'vac-1',
        redirectTo: '/admin/vacancies/',
        message: 'Вакансия удалена',
        errorTitle: 'Не удалось удалить вакансию',
        deleteAction,
      })
    )

    result.current()
    await vi.advanceTimersByTimeAsync(5000)

    expect(toaster.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Не удалось удалить вакансию', type: 'error' }),
    )
  })

  it('ActionFailure значением от deleteAction — тоже отдельный тост-ошибка, не тихий успех', async () => {
    const toaster = createMockToaster()
    const deleteAction = vi.fn().mockResolvedValue(actionFailure('Нельзя удалить — есть связанные записи'))

    const { result } = renderHook(() =>
      useDeleteWithUndoRedirect({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toaster: toaster as any,
        id: 'vac-1',
        redirectTo: '/admin/vacancies/',
        message: 'Вакансия удалена',
        errorTitle: 'Не удалось удалить вакансию',
        deleteAction,
      })
    )

    result.current()
    await vi.advanceTimersByTimeAsync(5000)

    expect(toaster.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Не удалось удалить вакансию', type: 'error' }),
    )
  })
})
