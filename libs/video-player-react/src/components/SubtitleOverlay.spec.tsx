import { render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SubtitleOverlay } from './SubtitleOverlay'

/** Готовит видео-элемент с ненулевыми размерами, как будто метаданные уже загружены */
function makeReadyVideo(): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperty(video, 'videoWidth', { value: 1920, configurable: true })
  Object.defineProperty(video, 'videoHeight', { value: 1080, configurable: true })
  video.getBoundingClientRect = () =>
    ({ width: 640, height: 360, top: 0, left: 0, right: 640, bottom: 360, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  return video
}

describe('SubtitleOverlay', () => {
  const originalOctopus = window.SubtitlesOctopus

  afterEach(() => {
    window.SubtitlesOctopus = originalOctopus
    vi.restoreAllMocks()
  })

  it('не рендерит собственный DOM (возвращает null)', () => {
    const videoRef = createRef<HTMLVideoElement>()
    const { container } = render(<SubtitleOverlay videoRef={videoRef} subtitleUrl={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('не создаёт инстанс SubtitlesOctopus если нет ни subtitleUrl, ни subtitleContent', () => {
    const ctor = vi.fn()
    window.SubtitlesOctopus = ctor as unknown as typeof window.SubtitlesOctopus

    const video = makeReadyVideo()
    const videoRef = { current: video }
    render(<SubtitleOverlay videoRef={videoRef} />)

    expect(ctor).not.toHaveBeenCalled()
  })

  it('не создаёт инстанс если window.SubtitlesOctopus не загружен', () => {
    window.SubtitlesOctopus = undefined

    const video = makeReadyVideo()
    const videoRef = { current: video }
    const onError = vi.fn()

    render(<SubtitleOverlay videoRef={videoRef} subtitleUrl="/subs.ass" onError={onError} />)

    expect(onError).not.toHaveBeenCalled()
  })

  it('создаёт инстанс SubtitlesOctopus с subUrl когда video готов и передан subtitleUrl', () => {
    const dispose = vi.fn()
    // ВАЖНО: реализация мока — обычная function, не arrow-функция.
    // Компонент вызывает конструктор через `new window.SubtitlesOctopus(options)`,
    // а arrow-функция не может быть constructor'ом — `new` на ней тихо падает,
    // ошибка гасится в try/catch компонента, и instanceRef.current так и остаётся null.
    const ctor = vi.fn().mockImplementation(function SubtitlesOctopusMock() {
      return {
        setTrackByUrl: vi.fn(),
        setTrack: vi.fn(),
        freeTrack: vi.fn(),
        setCurrentTime: vi.fn(),
        dispose,
        resize: vi.fn(),
      }
    })
    window.SubtitlesOctopus = ctor as unknown as typeof window.SubtitlesOctopus

    const video = makeReadyVideo()
    const videoRef = { current: video }

    const { unmount } = render(<SubtitleOverlay videoRef={videoRef} subtitleUrl="/subs.ass" />)

    expect(ctor).toHaveBeenCalledTimes(1)
    expect(ctor.mock.calls[0][0]).toMatchObject({ subUrl: '/subs.ass', video })

    unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('создаёт инстанс с subContent когда передан subtitleContent вместо URL', () => {
    const ctor = vi.fn().mockImplementation(function SubtitlesOctopusMock() {
      return {
        setTrackByUrl: vi.fn(),
        setTrack: vi.fn(),
        freeTrack: vi.fn(),
        setCurrentTime: vi.fn(),
        dispose: vi.fn(),
        resize: vi.fn(),
      }
    })
    window.SubtitlesOctopus = ctor as unknown as typeof window.SubtitlesOctopus

    const video = makeReadyVideo()
    const videoRef = { current: video }

    render(<SubtitleOverlay videoRef={videoRef} subtitleContent="WEBVTT" />)

    expect(ctor.mock.calls[0][0]).toMatchObject({ subContent: 'WEBVTT' })
  })
})
