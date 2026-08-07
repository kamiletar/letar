import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAudioSync } from './useAudioSync'

import type { UseAudioSyncOptions } from './useAudioSync'

function createVideoStub(): HTMLVideoElement {
  const video = document.createElement('video')
  vi.spyOn(video, 'play').mockResolvedValue(undefined)
  vi.spyOn(video, 'pause').mockImplementation(() => {})
  return video
}

function createAudioStub(): HTMLAudioElement {
  const audio = document.createElement('audio')
  vi.spyOn(audio, 'play').mockResolvedValue(undefined)
  vi.spyOn(audio, 'pause').mockImplementation(() => {})
  return audio
}

function makeOptions(overrides: Partial<UseAudioSyncOptions> = {}): UseAudioSyncOptions {
  return {
    videoRef: { current: createVideoStub() },
    audioRef: { current: createAudioStub() },
    usesSeparateAudio: true,
    isVideoReady: true,
    ...overrides,
  }
}

describe('useAudioSync', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('мьютит видео, когда usesSeparateAudio === true', () => {
    const video = createVideoStub()
    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, usesSeparateAudio: true })))
    expect(video.muted).toBe(true)
  })

  it('не мьютит видео, когда usesSeparateAudio === false', () => {
    const video = createVideoStub()
    video.muted = false
    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, usesSeparateAudio: false })))
    expect(video.muted).toBe(false)
  })

  it('ничего не синхронизирует, пока isVideoReady === false', () => {
    const video = createVideoStub()
    const audio = createAudioStub()
    const addSpy = vi.spyOn(video, 'addEventListener')
    renderHook(() =>
      useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio }, isVideoReady: false }))
    )
    expect(addSpy).not.toHaveBeenCalledWith('timeupdate', expect.any(Function))
  })

  it('ничего не синхронизирует, если usesSeparateAudio === false', () => {
    const video = createVideoStub()
    const audio = createAudioStub()
    const addSpy = vi.spyOn(video, 'addEventListener')
    renderHook(() =>
      useAudioSync(
        makeOptions({ videoRef: { current: video }, audioRef: { current: audio }, usesSeparateAudio: false }),
      )
    )
    expect(addSpy).not.toHaveBeenCalledWith('timeupdate', expect.any(Function))
  })

  it('подписывается на события video при готовности и раздельных дорожках', () => {
    const video = createVideoStub()
    const audio = createAudioStub()
    const addSpy = vi.spyOn(video, 'addEventListener')

    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio } })))

    expect(addSpy).toHaveBeenCalledWith('timeupdate', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('play', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('pause', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('seeked', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('ratechange', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('volumechange', expect.any(Function))
  })

  it('отписывается от событий video при размонтировании', () => {
    const video = createVideoStub()
    const audio = createAudioStub()
    const removeSpy = vi.spyOn(video, 'removeEventListener')

    const { unmount } = renderHook(() =>
      useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio } }))
    )
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('timeupdate', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('play', expect.any(Function))
  })

  it('выполняет начальную синхронизацию audio ← video (volume/playbackRate/currentTime)', () => {
    const video = createVideoStub()
    video.volume = 0.6
    video.playbackRate = 1.5
    video.currentTime = 12

    const audio = createAudioStub()
    audio.muted = true

    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio } })))

    expect(audio.volume).toBe(0.6)
    expect(audio.playbackRate).toBe(1.5)
    expect(audio.currentTime).toBe(12)
    expect(audio.muted).toBe(false)
  })

  it('запускает audio.play(), если видео уже воспроизводится на момент подключения', () => {
    const video = createVideoStub()
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    const audio = createAudioStub()

    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio } })))

    expect(audio.play).toHaveBeenCalledTimes(1)
  })

  it('событие "play" на video запускает audio.play()', () => {
    const video = createVideoStub()
    const audio = createAudioStub()

    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio } })))
    ;(audio.play as ReturnType<typeof vi.fn>).mockClear()

    act(() => {
      video.dispatchEvent(new Event('play'))
    })

    expect(audio.play).toHaveBeenCalledTimes(1)
  })

  it('событие "pause" на video вызывает audio.pause()', () => {
    const video = createVideoStub()
    const audio = createAudioStub()

    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio } })))

    act(() => {
      video.dispatchEvent(new Event('pause'))
    })

    expect(audio.pause).toHaveBeenCalledTimes(1)
  })

  it('событие "seeked" синхронизирует audio.currentTime с video.currentTime', () => {
    const video = createVideoStub()
    const audio = createAudioStub()

    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio } })))

    video.currentTime = 55
    act(() => {
      video.dispatchEvent(new Event('seeked'))
    })

    expect(audio.currentTime).toBe(55)
  })

  it('событие "timeupdate" синхронизирует audio, только если рассинхрон больше порога', () => {
    const video = createVideoStub()
    const audio = createAudioStub()

    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio } })))

    // рассинхрон меньше порога (0.1) — не трогаем
    video.currentTime = 10
    audio.currentTime = 10.05
    act(() => {
      video.dispatchEvent(new Event('timeupdate'))
    })
    expect(audio.currentTime).toBeCloseTo(10.05)

    // рассинхрон больше порога — синхронизируем
    video.currentTime = 10
    audio.currentTime = 8
    act(() => {
      video.dispatchEvent(new Event('timeupdate'))
    })
    expect(audio.currentTime).toBe(10)
  })

  it('событие "ratechange" синхронизирует audio.playbackRate', () => {
    const video = createVideoStub()
    const audio = createAudioStub()

    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio } })))

    video.playbackRate = 2
    act(() => {
      video.dispatchEvent(new Event('ratechange'))
    })

    expect(audio.playbackRate).toBe(2)
  })

  it('событие "volumechange" синхронизирует audio.volume', () => {
    const video = createVideoStub()
    const audio = createAudioStub()

    renderHook(() => useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio } })))

    video.volume = 0.2
    act(() => {
      video.dispatchEvent(new Event('volumechange'))
    })

    expect(audio.volume).toBe(0.2)
  })

  it('переподписывается при смене currentAudioTrackId', () => {
    const video = createVideoStub()
    const audio = createAudioStub()
    const removeSpy = vi.spyOn(video, 'removeEventListener')
    const addSpy = vi.spyOn(video, 'addEventListener')

    const { rerender } = renderHook(
      ({ currentAudioTrackId }) =>
        useAudioSync(makeOptions({ videoRef: { current: video }, audioRef: { current: audio }, currentAudioTrackId })),
      { initialProps: { currentAudioTrackId: 'track-1' } },
    )

    const addCallsBefore = addSpy.mock.calls.length
    rerender({ currentAudioTrackId: 'track-2' })

    expect(removeSpy).toHaveBeenCalledWith('timeupdate', expect.any(Function))
    expect(addSpy.mock.calls.length).toBeGreaterThan(addCallsBefore)
  })
})
