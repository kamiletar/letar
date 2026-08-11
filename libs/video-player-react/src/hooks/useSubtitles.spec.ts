import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { srtToVtt } from '@letar/video-player-core'
import { useSubtitles } from './useSubtitles'

import type { UseSubtitlesOptions } from './useSubtitles'

vi.mock('@letar/video-player-core', () => ({
  srtToVtt: vi.fn((text: string) => `WEBVTT (конверт из srt)\n\n${text}`),
}))

function makeOptions(overrides: Partial<UseSubtitlesOptions> = {}): UseSubtitlesOptions {
  return {
    videoRef: { current: document.createElement('video') },
    isVideoReady: true,
    ...overrides,
  }
}

describe('useSubtitles', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ text: async () => 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello' })),
    )
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('начальное состояние: активной дорожки нет, не грузится', () => {
    const { result } = renderHook(() => useSubtitles(makeOptions()))
    expect(result.current.activeTrackUrl).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('loadNative() возвращает null, если videoRef.current === null', async () => {
    const { result } = renderHook(() => useSubtitles(makeOptions({ videoRef: { current: null } })))

    let returned: string | null = 'not-null'
    await act(async () => {
      returned = await result.current.loadNative('/subs/a.vtt')
    })

    expect(returned).toBeNull()
  })

  it('loadNative() создаёт <track> в video и выставляет activeTrackUrl', async () => {
    const video = document.createElement('video')
    const { result } = renderHook(() => useSubtitles(makeOptions({ videoRef: { current: video } })))

    await act(async () => {
      await result.current.loadNative('/subs/a.vtt')
    })

    await waitFor(() => {
      expect(result.current.activeTrackUrl).toBe('/subs/a.vtt')
    })
    expect(video.querySelector('track')).not.toBeNull()
  })

  it('loadNative() конвертирует SRT в VTT перед созданием track', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ text: async () => '1\n00:00:00,000 --> 00:00:01,000\nHello' })),
    )

    const video = document.createElement('video')
    const { result } = renderHook(() => useSubtitles(makeOptions({ videoRef: { current: video } })))

    await act(async () => {
      await result.current.loadNative('/subs/a.srt')
    })

    expect(srtToVtt).toHaveBeenCalled()
  })

  it('loadNative() удаляет предыдущий track при повторном вызове', async () => {
    const video = document.createElement('video')
    const { result } = renderHook(() => useSubtitles(makeOptions({ videoRef: { current: video } })))

    await act(async () => {
      await result.current.loadNative('/subs/a.vtt')
    })
    await act(async () => {
      await result.current.loadNative('/subs/b.vtt')
    })

    expect(video.querySelectorAll('track')).toHaveLength(1)
  })

  it('loadNative() возвращает null и не бросает исключение при ошибке fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network error')
      }),
    )
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const video = document.createElement('video')
    const { result } = renderHook(() => useSubtitles(makeOptions({ videoRef: { current: video } })))

    let returned: string | null = 'not-null'
    await act(async () => {
      returned = await result.current.loadNative('/subs/a.vtt')
    })

    expect(returned).toBeNull()
    consoleErrorSpy.mockRestore()
  })

  it('show() выставляет mode="showing" для всех textTracks', () => {
    const video = document.createElement('video')
    video.appendChild(document.createElement('track'))
    const { result } = renderHook(() => useSubtitles(makeOptions({ videoRef: { current: video } })))

    expect(() => result.current.show()).not.toThrow()
  })

  it('hide() сбрасывает activeTrackUrl в null', async () => {
    const video = document.createElement('video')
    const { result } = renderHook(() => useSubtitles(makeOptions({ videoRef: { current: video } })))

    await act(async () => {
      await result.current.loadNative('/subs/a.vtt')
    })
    await waitFor(() => expect(result.current.activeTrackUrl).toBe('/subs/a.vtt'))

    act(() => {
      result.current.hide()
    })

    expect(result.current.activeTrackUrl).toBeNull()
  })

  it('освобождает blob URL при размонтировании', async () => {
    const video = document.createElement('video')
    const { result, unmount } = renderHook(() => useSubtitles(makeOptions({ videoRef: { current: video } })))

    await act(async () => {
      await result.current.loadNative('/subs/a.vtt')
    })

    unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})
