import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFormStoreSubscribe } from './use-form-store-subscribe'

describe('useFormStoreSubscribe', () => {
  it('вызывает callback при подписке и cleanup через bare-функцию (v0.7.x/v0.9.x)', () => {
    const cleanup = vi.fn()
    const subscribe = vi.fn(() => cleanup)
    const form = { store: { subscribe } }
    const callback = vi.fn()

    const { unmount } = renderHook(() => useFormStoreSubscribe(form, callback, []))

    expect(subscribe).toHaveBeenCalledWith(callback)
    expect(cleanup).not.toHaveBeenCalled()

    unmount()

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('вызывает cleanup через .unsubscribe() когда subscribe возвращает объект (v0.11+)', () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.fn(() => ({ unsubscribe }))
    const form = { store: { subscribe } }
    const callback = vi.fn()

    const { unmount } = renderHook(() => useFormStoreSubscribe(form, callback, []))

    expect(unsubscribe).not.toHaveBeenCalled()

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('переподписывается при смене deps', () => {
    const unsubscribe1 = vi.fn()
    const unsubscribe2 = vi.fn()
    const subscribe = vi.fn().mockReturnValueOnce({ unsubscribe: unsubscribe1 }).mockReturnValueOnce({
      unsubscribe: unsubscribe2,
    })
    const form = { store: { subscribe } }
    const callback = vi.fn()

    const { rerender } = renderHook(({ dep }) => useFormStoreSubscribe(form, callback, [dep]), {
      initialProps: { dep: 1 },
    })

    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(unsubscribe1).not.toHaveBeenCalled()

    rerender({ dep: 2 })

    expect(unsubscribe1).toHaveBeenCalledTimes(1)
    expect(subscribe).toHaveBeenCalledTimes(2)
    expect(unsubscribe2).not.toHaveBeenCalled()
  })
})
