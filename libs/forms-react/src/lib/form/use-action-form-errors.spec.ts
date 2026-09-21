import { actionFailure, ActionFailureError, unwrapActionResult } from '@letar/forms-core/server-errors'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useActionFormErrors } from './use-action-form-errors'

function mountedRef(result: { current: ReturnType<typeof useActionFormErrors> }) {
  const api = { setFieldMeta: vi.fn(), setErrorMap: vi.fn() }
  ;(result.current.formRef as { current: unknown }).current = api
  return api
}

describe('useActionFormErrors', () => {
  it('отдаёт formRef и middleware.onError', () => {
    const { result } = renderHook(() => useActionFormErrors())
    expect(result.current.formRef.current).toBeNull()
    expect(typeof result.current.middleware.onError).toBe('function')
  })

  it('middleware стабилен между рендерами (не пересоздаёт форму)', () => {
    const { result, rerender } = renderHook(() => useActionFormErrors())
    const first = result.current.middleware
    rerender()
    expect(result.current.middleware).toBe(first)
  })

  it('отказ с полем: под поле и в общий блок', () => {
    const { result } = renderHook(() => useActionFormErrors())
    const api = mountedRef(result)

    let thrown: unknown
    try {
      unwrapActionResult(actionFailure('Такой адрес уже занят', 'slug'))
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(ActionFailureError)
    result.current.middleware.onError(thrown as Error)

    expect(api.setFieldMeta).toHaveBeenCalledWith('slug', expect.any(Function))
    expect(api.setErrorMap).toHaveBeenCalledWith({ onSubmit: 'Такой адрес уже занят' })
  })

  it('прочая ошибка разбирается общим mapServerErrors', () => {
    const { result } = renderHook(() => useActionFormErrors())
    const api = mountedRef(result)

    result.current.middleware.onError(new Error('Сервер недоступен'))

    expect(api.setErrorMap).toHaveBeenCalledWith({ onSubmit: 'Сервер недоступен' })
  })

  it('опции mapServerErrors (fieldMap) передаются дальше', () => {
    const { result } = renderHook(() =>
      useActionFormErrors({ fieldMap: { sku: { field: 'sku', message: 'Такой артикул уже используется' } } })
    )
    const api = mountedRef(result)

    result.current.middleware.onError({ code: 'P2002', meta: { target: ['sku'] } } as unknown as Error)

    expect(api.setFieldMeta).toHaveBeenCalledWith('sku', expect.any(Function))
  })

  it('форма ещё не смонтирована — не падает', () => {
    const { result } = renderHook(() => useActionFormErrors())
    expect(() => result.current.middleware.onError(new Error('x'))).not.toThrow()
  })
})
