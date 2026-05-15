import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRateLimit } from '../rate-limiter'

describe('useRateLimit', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('возвращает null если config не задан', () => {
    const { result } = renderHook(() => useRateLimit(undefined))
    expect(result.current).toBeNull()
  })

  it('разрешает submit в пределах лимита', () => {
    const { result } = renderHook(() => useRateLimit({ maxSubmits: 3, windowMs: 60000 }))

    expect(result.current!.isBlocked).toBe(false)

    let allowed = false
    act(() => {
      allowed = result.current!.recordAttempt()
    })

    expect(allowed).toBe(true)
    // remaining пересчитывается при следующем рендере
    // Записано 1 попытка, осталось 2
    expect(result.current!.remaining).toBe(2)
  })

  it('блокирует submit при превышении лимита', () => {
    const { result } = renderHook(() => useRateLimit({ maxSubmits: 2, windowMs: 60000 }))

    // 2 разрешённые попытки
    act(() => {
      result.current!.recordAttempt()
    })
    act(() => {
      result.current!.recordAttempt()
    })

    // 3-я попытка — блокировка
    act(() => {
      const allowed = result.current!.recordAttempt()
      expect(allowed).toBe(false)
    })

    expect(result.current!.isBlocked).toBe(true)
    expect(result.current!.secondsLeft).toBeGreaterThan(0)
  })

  it('сбрасывает состояние через reset()', () => {
    const { result } = renderHook(() => useRateLimit({ maxSubmits: 1, windowMs: 60000 }))

    act(() => {
      result.current!.recordAttempt()
    })
    act(() => {
      result.current!.recordAttempt() // Блокировка
    })

    expect(result.current!.isBlocked).toBe(true)

    act(() => {
      result.current!.reset()
    })

    expect(result.current!.isBlocked).toBe(false)
  })
})
