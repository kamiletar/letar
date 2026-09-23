import type { CreateToasterReturn } from '@chakra-ui/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useActionWithToast } from './use-action-with-toast'

function fakeToaster() {
  return { create: vi.fn() } as unknown as CreateToasterReturn
}

describe('useActionWithToast', () => {
  it('показывает тост с errorTitle, если action бросил исключение', async () => {
    const toaster = fakeToaster()
    const { result } = renderHook(() => useActionWithToast(toaster))

    act(() => {
      result.current.run(() => Promise.reject(new Error('network down')), {
        errorTitle: 'Не удалось выполнить действие',
      })
    })

    await waitFor(() =>
      expect(toaster.create).toHaveBeenCalledWith({
        title: 'Не удалось выполнить действие',
        description: 'network down',
        type: 'error',
      })
    )
  })

  it('показывает бизнес-ошибку из getError, не вызывая onSuccess', async () => {
    const toaster = fakeToaster()
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useActionWithToast(toaster))

    act(() => {
      result.current.run(() => Promise.resolve({ error: 'Такое имя уже занято' }), {
        errorTitle: 'Не удалось сохранить',
        getError: (r) => r.error,
        onSuccess,
      })
    })

    await waitFor(() => expect(toaster.create).toHaveBeenCalledWith({ title: 'Такое имя уже занято', type: 'error' }))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('вызывает onSuccess с результатом, если бизнес-ошибки нет', async () => {
    const toaster = fakeToaster()
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useActionWithToast(toaster))

    act(() => {
      result.current.run(() => Promise.resolve({ id: '42' }), {
        errorTitle: 'Не удалось сохранить',
        getError: () => undefined,
        onSuccess,
      })
    })

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: '42' }))
    expect(toaster.create).not.toHaveBeenCalled()
  })

  it('вызывает onError при бизнес-ошибке И при исключении — для отката оптимистичного состояния', async () => {
    const toaster = fakeToaster()
    const onError = vi.fn()
    const { result, rerender } = renderHook(() => useActionWithToast(toaster))

    act(() => {
      result.current.run(() => Promise.resolve({ error: 'отказ' }), {
        errorTitle: 'Не удалось',
        getError: (r) => r.error,
        onError,
      })
    })
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))

    rerender()
    act(() => {
      result.current.run(() => Promise.reject(new Error('boom')), {
        errorTitle: 'Не удалось',
        onError,
      })
    })
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2))
  })
})
