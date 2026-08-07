import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePlayerControls } from './usePlayerControls'

import type { UsePlayerControlsOptions } from './usePlayerControls'

/** Создаёт video-элемент с замоканным play(), т.к. jsdom не умеет воспроизводить медиа */
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

function makeOptions(overrides: Partial<UsePlayerControlsOptions> = {}): UsePlayerControlsOptions {
  return {
    videoRef: { current: createVideoStub() },
    audioRef: { current: null },
    containerRef: { current: document.createElement('div') },
    usesSeparateAudio: false,
    usesSeparateAudioRef: { current: false },
    duration: 100,
    setIsMuted: vi.fn(),
    ...overrides,
  }
}

describe('usePlayerControls', () => {
  it('play() вызывает video.play()', () => {
    const options = makeOptions()
    const { result } = renderHook(() => usePlayerControls(options))
    result.current.play()
    expect(options.videoRef.current!.play).toHaveBeenCalledTimes(1)
  })

  it('play() не бросает исключение, если videoRef.current === null', () => {
    const options = makeOptions({ videoRef: { current: null } })
    const { result } = renderHook(() => usePlayerControls(options))
    expect(() => result.current.play()).not.toThrow()
  })

  it('pause() вызывает video.pause()', () => {
    const options = makeOptions()
    const { result } = renderHook(() => usePlayerControls(options))
    result.current.pause()
    expect(options.videoRef.current!.pause).toHaveBeenCalledTimes(1)
  })

  it('togglePlay() вызывает play(), если видео на паузе', () => {
    const video = createVideoStub()
    Object.defineProperty(video, 'paused', { value: true, configurable: true })
    const options = makeOptions({ videoRef: { current: video } })
    const { result } = renderHook(() => usePlayerControls(options))
    result.current.togglePlay()
    expect(video.play).toHaveBeenCalledTimes(1)
    expect(video.pause).not.toHaveBeenCalled()
  })

  it('togglePlay() вызывает pause(), если видео уже играет', () => {
    const video = createVideoStub()
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    const options = makeOptions({ videoRef: { current: video } })
    const { result } = renderHook(() => usePlayerControls(options))
    result.current.togglePlay()
    expect(video.pause).toHaveBeenCalledTimes(1)
    expect(video.play).not.toHaveBeenCalled()
  })

  it('seek() выставляет currentTime, ограничивая диапазоном [0, duration]', () => {
    const video = createVideoStub()
    const options = makeOptions({ videoRef: { current: video }, duration: 50 })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.seek(30)
    expect(video.currentTime).toBe(30)

    result.current.seek(-10)
    expect(video.currentTime).toBe(0)

    result.current.seek(999)
    expect(video.currentTime).toBe(50)
  })

  it('handleSeek() конвертирует проценты [0-100] в секунды относительно duration', () => {
    const video = createVideoStub()
    const options = makeOptions({ videoRef: { current: video }, duration: 200 })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.handleSeek([50])
    expect(video.currentTime).toBe(100)
  })

  it('handleSeek() ничего не делает, если duration не конечно (Infinity/NaN)', () => {
    const video = createVideoStub()
    const options = makeOptions({ videoRef: { current: video }, duration: Infinity })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.handleSeek([50])
    expect(video.currentTime).toBe(0)
  })

  it('skipTime() перематывает на переданное число секунд относительно текущего времени', () => {
    const video = createVideoStub()
    video.currentTime = 20
    const options = makeOptions({ videoRef: { current: video }, duration: 100 })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.skipTime(10)
    expect(video.currentTime).toBe(30)
  })

  it('skipTime() без аргумента использует значение по умолчанию (10 сек)', () => {
    const video = createVideoStub()
    video.currentTime = 0
    const options = makeOptions({ videoRef: { current: video }, duration: 100 })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.skipTime()
    expect(video.currentTime).toBe(10)
  })

  it('skipTime() ограничивает результат диапазоном [0, duration]', () => {
    const video = createVideoStub()
    video.currentTime = 95
    const options = makeOptions({ videoRef: { current: video }, duration: 100 })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.skipTime(20)
    expect(video.currentTime).toBe(100)
  })

  it('setVolume() в обычном режиме выставляет video.volume и video.muted', () => {
    const video = createVideoStub()
    const options = makeOptions({ videoRef: { current: video }, usesSeparateAudioRef: { current: false } })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.setVolume(0.5)
    expect(video.volume).toBe(0.5)
    expect(video.muted).toBe(false)

    result.current.setVolume(0)
    expect(video.muted).toBe(true)
  })

  it('setVolume() в режиме раздельных дорожек выставляет audio.volume/muted и вызывает setIsMuted', () => {
    const video = createVideoStub()
    const audio = createAudioStub()
    const setIsMuted = vi.fn()
    const options = makeOptions({
      videoRef: { current: video },
      audioRef: { current: audio },
      usesSeparateAudioRef: { current: true },
      setIsMuted,
    })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.setVolume(0.7)
    expect(video.volume).toBe(0.7)
    expect(audio.volume).toBe(0.7)
    expect(audio.muted).toBe(false)
    expect(setIsMuted).toHaveBeenCalledWith(false)
  })

  it('setVolume() ограничивает значение диапазоном [0, 1]', () => {
    const video = createVideoStub()
    const options = makeOptions({ videoRef: { current: video } })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.setVolume(2)
    expect(video.volume).toBe(1)

    result.current.setVolume(-1)
    expect(video.volume).toBe(0)
  })

  it('handleVolumeChange() конвертирует [0-100] в [0-1] и делегирует setVolume', () => {
    const video = createVideoStub()
    const options = makeOptions({ videoRef: { current: video } })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.handleVolumeChange([40])
    expect(video.volume).toBeCloseTo(0.4)
  })

  it('toggleMute() в обычном режиме переключает video.muted', () => {
    const video = createVideoStub()
    video.muted = false
    const options = makeOptions({ videoRef: { current: video }, usesSeparateAudio: false })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.toggleMute()
    expect(video.muted).toBe(true)
  })

  it('toggleMute() в режиме раздельных дорожек переключает audio.muted и вызывает setIsMuted', () => {
    const video = createVideoStub()
    const audio = createAudioStub()
    audio.muted = false
    const setIsMuted = vi.fn()
    const options = makeOptions({
      videoRef: { current: video },
      audioRef: { current: audio },
      usesSeparateAudio: true,
      setIsMuted,
    })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.toggleMute()
    expect(audio.muted).toBe(true)
    expect(setIsMuted).toHaveBeenCalledWith(true)
  })

  it('toggleFullscreen() вызывает container.requestFullscreen(), если fullscreen ещё не активен', () => {
    const container = document.createElement('div')
    const requestFullscreen = vi.fn()
    container.requestFullscreen = requestFullscreen
    const options = makeOptions({ containerRef: { current: container } })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.toggleFullscreen()
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
  })

  it('toggleFullscreen() вызывает document.exitFullscreen(), если fullscreen уже активен', () => {
    const container = document.createElement('div')
    const options = makeOptions({ containerRef: { current: container } })

    // jsdom не реализует Fullscreen API — определяем сами перед spyOn
    if (!('exitFullscreen' in document)) {
      Object.defineProperty(document, 'exitFullscreen', { value: () => Promise.resolve(), configurable: true })
    }
    const exitFullscreen = vi.spyOn(document, 'exitFullscreen').mockImplementation(() => Promise.resolve())
    if (!Object.getOwnPropertyDescriptor(document, 'fullscreenElement')?.get) {
      Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true, writable: true })
    }
    vi.spyOn(document, 'fullscreenElement', 'get').mockReturnValue(container)

    const { result } = renderHook(() => usePlayerControls(options))
    result.current.toggleFullscreen()
    expect(exitFullscreen).toHaveBeenCalledTimes(1)

    exitFullscreen.mockRestore()
  })

  it('setPlaybackRate() выставляет playbackRate у video, и у audio в режиме раздельных дорожек', () => {
    const video = createVideoStub()
    const audio = createAudioStub()
    const options = makeOptions({
      videoRef: { current: video },
      audioRef: { current: audio },
      usesSeparateAudioRef: { current: true },
    })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.setPlaybackRate(1.5)
    expect(video.playbackRate).toBe(1.5)
    expect(audio.playbackRate).toBe(1.5)
  })

  it('setPlaybackRate() не трогает audio, если usesSeparateAudioRef.current === false', () => {
    const video = createVideoStub()
    const audio = createAudioStub()
    const options = makeOptions({
      videoRef: { current: video },
      audioRef: { current: audio },
      usesSeparateAudioRef: { current: false },
    })
    const { result } = renderHook(() => usePlayerControls(options))

    result.current.setPlaybackRate(2)
    expect(video.playbackRate).toBe(2)
    expect(audio.playbackRate).toBe(1)
  })
})
