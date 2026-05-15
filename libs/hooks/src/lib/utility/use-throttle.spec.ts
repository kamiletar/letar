import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useThrottle } from './use-throttle'

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('вызывает функцию сразу при первом вызове', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottle(callback, 300))

    act(() => {
      result.current()
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('не вызывает функцию повторно до истечения delay', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottle(callback, 300))

    act(() => {
      result.current()
      result.current()
      result.current()
    })

    // Только первый вызов прошёл сразу
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('вызывает последний отложенный вызов после delay', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottle(callback, 300))

    act(() => {
      result.current()
      result.current()
    })

    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Отложенный вызов выполнился
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('позволяет новый вызов после истечения delay', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottle(callback, 300))

    act(() => {
      result.current()
    })

    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(300)
    })

    act(() => {
      result.current()
    })

    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('передаёт аргументы в callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottle(callback, 300))

    act(() => {
      result.current('arg1', 'arg2')
    })

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('использует 300мс по умолчанию', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottle(callback))

    act(() => {
      result.current()
      result.current()
    })

    act(() => {
      vi.advanceTimersByTime(299)
    })

    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('возвращает стабильную функцию', () => {
    const callback = vi.fn()
    const { result, rerender } = renderHook(() => useThrottle(callback, 300))

    const firstResult = result.current
    rerender()
    const secondResult = result.current

    expect(firstResult).toBe(secondResult)
  })
})
