import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAutoHideControls } from './useAutoHideControls'

describe('useAutoHideControls', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('изначально контролы показаны', () => {
    const { result } = renderHook(() => useAutoHideControls({ isPlaying: false }))
    expect(result.current.showControls).toBe(true)
  })

  it('не скрывает контролы по таймауту, если видео на паузе', () => {
    const { result } = renderHook(() => useAutoHideControls({ isPlaying: false }))

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current.showControls).toBe(true)
  })

  it('скрывает контролы по таймауту при воспроизведении', () => {
    const { result } = renderHook(() => useAutoHideControls({ isPlaying: true, timeout: 3000 }))

    expect(result.current.showControls).toBe(true)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.showControls).toBe(false)
  })

  it('использует кастомный timeout', () => {
    const { result } = renderHook(() => useAutoHideControls({ isPlaying: true, timeout: 1000 }))

    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(result.current.showControls).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.showControls).toBe(false)
  })

  it('show() принудительно показывает контролы', () => {
    const { result } = renderHook(() => useAutoHideControls({ isPlaying: true, timeout: 1000 }))

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.showControls).toBe(false)

    act(() => {
      result.current.show()
    })
    expect(result.current.showControls).toBe(true)
  })

  it('hide() принудительно скрывает контролы', () => {
    const { result } = renderHook(() => useAutoHideControls({ isPlaying: false }))

    act(() => {
      result.current.hide()
    })
    expect(result.current.showControls).toBe(false)
  })

  it('resetHideTimeout() перезапускает таймер скрытия при воспроизведении', () => {
    const { result } = renderHook(() => useAutoHideControls({ isPlaying: true, timeout: 1000 }))

    act(() => {
      vi.advanceTimersByTime(700)
    })
    act(() => {
      result.current.resetHideTimeout()
    })
    // после сброса контролы снова видимы, и полный таймаут отсчитывается заново
    expect(result.current.showControls).toBe(true)

    act(() => {
      vi.advanceTimersByTime(700)
    })
    expect(result.current.showControls).toBe(true)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.showControls).toBe(false)
  })

  it('переключение isPlaying с true на false останавливает скрытие и показывает контролы', () => {
    const { result, rerender } = renderHook(({ isPlaying }) => useAutoHideControls({ isPlaying, timeout: 1000 }), {
      initialProps: { isPlaying: true },
    })

    rerender({ isPlaying: false })
    expect(result.current.showControls).toBe(true)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.showControls).toBe(true)
  })

  it('очищает таймер при размонтировании (не бросает исключений)', () => {
    const { unmount } = renderHook(() => useAutoHideControls({ isPlaying: true, timeout: 1000 }))
    expect(() => unmount()).not.toThrow()
  })
})
