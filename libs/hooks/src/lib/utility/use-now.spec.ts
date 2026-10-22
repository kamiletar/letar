import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNow } from './use-now'

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-22T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('возвращает время монтирования', () => {
    const { result } = renderHook(() => useNow())
    expect(result.current.toISOString()).toBe('2026-10-22T10:00:00.000Z')
  })

  it('без refreshMs не меняется между рендерами', () => {
    const { result, rerender } = renderHook(() => useNow())
    const first = result.current

    vi.setSystemTime(new Date('2026-10-22T10:05:00Z'))
    rerender()

    expect(result.current).toBe(first)
  })

  it('с refreshMs обновляется по таймеру', () => {
    const { result } = renderHook(() => useNow(60_000))

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current.toISOString()).toBe('2026-10-22T10:01:00.000Z')
  })

  it('снимает таймер при размонтировании', () => {
    const { unmount } = renderHook(() => useNow(1_000))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
