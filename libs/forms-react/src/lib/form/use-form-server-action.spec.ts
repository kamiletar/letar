import { act, renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { AppFormApi } from '../types'
import { useFormServerAction } from './use-form-server-action'

function createFormRef(): RefObject<AppFormApi | null> {
  return {
    current: {
      setFieldMeta: vi.fn(),
      setErrorMap: vi.fn(),
    },
  }
}

describe('useFormServerAction', () => {
  it('pending true во время выполнения action, false после успеха', async () => {
    let resolveAction: (() => void) | undefined
    const action = vi.fn().mockImplementation(
      () =>
        new Promise<{ id: string }>((resolve) => {
          resolveAction = () => resolve({ id: '1' })
        }),
    )
    const formRef = createFormRef()
    const { result } = renderHook(() => useFormServerAction(formRef))

    let runPromise: Promise<unknown> = Promise.resolve()
    act(() => {
      runPromise = result.current.run(action)
    })

    expect(result.current.pending).toBe(true)

    act(() => {
      resolveAction?.()
    })
    await act(async () => {
      await runPromise
    })

    expect(result.current.pending).toBe(false)
  })

  it('вызывает onSuccess с результатом action и не трогает форму', async () => {
    const action = vi.fn().mockResolvedValue({ id: '42' })
    const onSuccess = vi.fn()
    const formRef = createFormRef()
    const { result } = renderHook(() => useFormServerAction(formRef))

    await act(async () => {
      await result.current.run(action, onSuccess)
    })

    expect(onSuccess).toHaveBeenCalledWith({ id: '42' })
    expect(formRef.current?.setFieldMeta).not.toHaveBeenCalled()
    expect(formRef.current?.setErrorMap).not.toHaveBeenCalled()
  })

  it('показывает toaster.success только когда задан successMessage', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    const toaster = { create: vi.fn() }
    const formRef = createFormRef()

    const { result: withoutMessage } = renderHook(() => useFormServerAction(formRef, { toaster }))
    await act(async () => {
      await withoutMessage.current.run(action)
    })
    expect(toaster.create).not.toHaveBeenCalled()

    const { result: withMessage } = renderHook(() =>
      useFormServerAction(formRef, { toaster, successMessage: 'Сохранено' })
    )
    await act(async () => {
      await withMessage.current.run(action)
    })
    expect(toaster.create).toHaveBeenCalledWith({ type: 'success', title: 'Сохранено' })
  })

  it('маппит fieldMap-ошибку (P2002) на конкретное поле через formRef, без общего toaster-текста по умолчанию', async () => {
    const originalError = { code: 'P2002', meta: { target: ['sku'] } }
    const action = vi.fn().mockRejectedValue(originalError)
    const formRef = createFormRef()
    const { result } = renderHook(() =>
      useFormServerAction(formRef, {
        fieldMap: { sku: { field: 'sku', message: 'Такой артикул уже используется' } },
      })
    )

    await act(async () => {
      await expect(result.current.run(action)).rejects.toBe(originalError)
    })

    expect(formRef.current?.setFieldMeta).toHaveBeenCalledWith('sku', expect.any(Function))
    expect(formRef.current?.setErrorMap).not.toHaveBeenCalled()
  })

  it('показывает toaster.error с сообщением поля, если formErrors пуст (field-only ошибка)', async () => {
    const originalError = { code: 'P2002', meta: { target: ['sku'] } }
    const action = vi.fn().mockRejectedValue(originalError)
    const toaster = { create: vi.fn() }
    const formRef = createFormRef()
    const { result } = renderHook(() =>
      useFormServerAction(formRef, {
        toaster,
        fieldMap: { sku: { field: 'sku', message: 'Такой артикул уже используется' } },
      })
    )

    await act(async () => {
      await expect(result.current.run(action)).rejects.toBe(originalError)
    })

    expect(toaster.create).toHaveBeenCalledWith({ type: 'error', title: 'Такой артикул уже используется' })
  })

  it('показывает toaster.error с formErrors, применяет их через setErrorMap', async () => {
    const originalError = new Error('Сервер недоступен')
    const action = vi.fn().mockRejectedValue(originalError)
    const toaster = { create: vi.fn() }
    const formRef = createFormRef()
    const { result } = renderHook(() => useFormServerAction(formRef, { toaster }))

    await act(async () => {
      await expect(result.current.run(action)).rejects.toBe(originalError)
    })

    expect(formRef.current?.setErrorMap).toHaveBeenCalledWith({ onSubmit: 'Сервер недоступен' })
    expect(toaster.create).toHaveBeenCalledWith({ type: 'error', title: 'Сервер недоступен' })
  })

  it('не падает при applyServerErrors, если formRef.current ещё null (форма не смонтирована) — но всё равно перебрасывает исходную ошибку', async () => {
    const originalError = new Error('boom')
    const action = vi.fn().mockRejectedValue(originalError)
    const formRef: RefObject<AppFormApi | null> = { current: null }
    const { result } = renderHook(() => useFormServerAction(formRef))

    await act(async () => {
      await expect(result.current.run(action)).rejects.toBe(originalError)
    })
  })

  it('перебрасывает исходную ошибку ПОСЛЕ применения mapServerErrors — иначе <Form> считает сабмит успешным и стирает применённые field-level ошибки своим post-submit reset', async () => {
    const originalError = new Error('boom')
    const action = vi.fn().mockRejectedValue(originalError)
    const formRef = createFormRef()
    const { result } = renderHook(() => useFormServerAction(formRef))

    await act(async () => {
      await expect(result.current.run(action)).rejects.toBe(originalError)
    })

    // Ошибка применена к форме ДО того, как переброшена дальше — порядок важен для вызывающего
    // кода, который читает formRef сразу после catch/reject.
    expect(formRef.current?.setErrorMap).toHaveBeenCalledWith({ onSubmit: 'boom' })
  })
})
