import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useKeyboardShortcuts } from './useKeyboardShortcuts'

import type { UseKeyboardShortcutsOptions } from './useKeyboardShortcuts'

function dispatchKey(key: string, target?: EventTarget) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  if (target) {
    Object.defineProperty(event, 'target', { value: target, configurable: true })
  }
  window.dispatchEvent(event)
  return event
}

function makeOptions(overrides: Partial<UseKeyboardShortcutsOptions> = {}): UseKeyboardShortcutsOptions {
  return {
    videoRef: createRef<HTMLVideoElement | null>(),
    togglePlay: vi.fn(),
    skipTime: vi.fn(),
    toggleMute: vi.fn(),
    toggleFullscreen: vi.fn(),
    ...overrides,
  }
}

describe('useKeyboardShortcuts', () => {
  let addSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addSpy = vi.spyOn(window, 'addEventListener')
    removeSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('навешивает обработчик keydown на window при монтировании', () => {
    renderHook(() => useKeyboardShortcuts(makeOptions()))
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('снимает обработчик keydown при размонтировании', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(makeOptions()))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('не навешивает обработчик, если disabled: true', () => {
    renderHook(() => useKeyboardShortcuts(makeOptions({ disabled: true })))
    expect(addSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('Space вызывает togglePlay', () => {
    const togglePlay = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ togglePlay })))
    dispatchKey(' ')
    expect(togglePlay).toHaveBeenCalledTimes(1)
  })

  it('"k" и русская "л" вызывают togglePlay', () => {
    const togglePlay = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ togglePlay })))
    dispatchKey('k')
    dispatchKey('л')
    expect(togglePlay).toHaveBeenCalledTimes(2)
  })

  it('ArrowLeft вызывает skipTime(-10)', () => {
    const skipTime = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ skipTime })))
    dispatchKey('ArrowLeft')
    expect(skipTime).toHaveBeenCalledWith(-10)
  })

  it('ArrowRight вызывает skipTime(10)', () => {
    const skipTime = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ skipTime })))
    dispatchKey('ArrowRight')
    expect(skipTime).toHaveBeenCalledWith(10)
  })

  it('ArrowUp увеличивает громкость видео на 0.1 (максимум 1)', () => {
    const video = document.createElement('video')
    video.volume = 0.95
    const videoRef = { current: video }
    renderHook(() => useKeyboardShortcuts(makeOptions({ videoRef })))
    dispatchKey('ArrowUp')
    expect(video.volume).toBeCloseTo(1)
  })

  it('ArrowDown уменьшает громкость видео на 0.1 (минимум 0)', () => {
    const video = document.createElement('video')
    video.volume = 0.05
    const videoRef = { current: video }
    renderHook(() => useKeyboardShortcuts(makeOptions({ videoRef })))
    dispatchKey('ArrowDown')
    expect(video.volume).toBeCloseTo(0)
  })

  it('"m" и русская "ь" вызывают toggleMute', () => {
    const toggleMute = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ toggleMute })))
    dispatchKey('m')
    dispatchKey('ь')
    expect(toggleMute).toHaveBeenCalledTimes(2)
  })

  it('"f" и русская "а" вызывают toggleFullscreen', () => {
    const toggleFullscreen = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ toggleFullscreen })))
    dispatchKey('f')
    dispatchKey('а')
    expect(toggleFullscreen).toHaveBeenCalledTimes(2)
  })

  it('"[" уменьшает скорость воспроизведения на 0.25, если передан adjustPlaybackSpeed', () => {
    const adjustPlaybackSpeed = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ adjustPlaybackSpeed })))
    dispatchKey('[')
    expect(adjustPlaybackSpeed).toHaveBeenCalledWith(-0.25)
  })

  it('"]" увеличивает скорость воспроизведения на 0.25', () => {
    const adjustPlaybackSpeed = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ adjustPlaybackSpeed })))
    dispatchKey(']')
    expect(adjustPlaybackSpeed).toHaveBeenCalledWith(0.25)
  })

  it('не бросает исключение при "[" без переданного adjustPlaybackSpeed', () => {
    renderHook(() => useKeyboardShortcuts(makeOptions()))
    expect(() => dispatchKey('[')).not.toThrow()
  })

  it('"i" вызывает toggleVideoInfo, если передан', () => {
    const toggleVideoInfo = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ toggleVideoInfo })))
    dispatchKey('i')
    expect(toggleVideoInfo).toHaveBeenCalledTimes(1)
  })

  it('игнорирует нажатия, когда фокус на input', () => {
    const togglePlay = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ togglePlay })))
    const input = document.createElement('input')
    document.body.appendChild(input)
    dispatchKey(' ', input)
    expect(togglePlay).not.toHaveBeenCalled()
    input.remove()
  })

  it('игнорирует нажатия, когда фокус на textarea', () => {
    const togglePlay = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ togglePlay })))
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    dispatchKey(' ', textarea)
    expect(togglePlay).not.toHaveBeenCalled()
    textarea.remove()
  })

  it('игнорирует неизвестные клавиши', () => {
    const togglePlay = vi.fn()
    const skipTime = vi.fn()
    renderHook(() => useKeyboardShortcuts(makeOptions({ togglePlay, skipTime })))
    dispatchKey('q')
    expect(togglePlay).not.toHaveBeenCalled()
    expect(skipTime).not.toHaveBeenCalled()
  })

  it('переустанавливает обработчик при изменении callback-пропсов', () => {
    const togglePlay1 = vi.fn()
    const togglePlay2 = vi.fn()
    const { rerender } = renderHook(
      ({ togglePlay }) => useKeyboardShortcuts(makeOptions({ togglePlay })),
      { initialProps: { togglePlay: togglePlay1 } },
    )

    rerender({ togglePlay: togglePlay2 })

    dispatchKey(' ')
    expect(togglePlay1).not.toHaveBeenCalled()
    expect(togglePlay2).toHaveBeenCalledTimes(1)
  })
})
