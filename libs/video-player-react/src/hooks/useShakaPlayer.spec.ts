import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useShakaPlayer } from './useShakaPlayer'

import type { UseShakaPlayerOptions } from './useShakaPlayer'

/**
 * useShakaPlayer управляет реальным `shaka-player` инстансом и создаёт `<video>` руками —
 * поэтому тестируем через полностью замоканный Shaka-модуль (структурное соответствие
 * минимальному интерфейсу, который использует хук), не настоящую библиотеку.
 * Не покрыто намеренно: поведение реального shaka-player (буферизация, ABR, DRM) —
 * это ответственность самой библиотеки, не хука.
 */
function createShakaMock(overrides: { isBrowserSupported?: boolean; loadImpl?: () => Promise<void> } = {}) {
  const listeners = new Map<string, (event: unknown) => void>()

  const playerInstance = {
    attach: vi.fn(),
    load: vi.fn(overrides.loadImpl ?? (() => Promise.resolve())),
    unload: vi.fn(() => Promise.resolve()),
    destroy: vi.fn(),
    addEventListener: vi.fn((event: string, cb: (event: unknown) => void) => {
      listeners.set(event, cb)
    }),
    removeEventListener: vi.fn(),
  }

  // vi.fn() оборачивает обычную function-реализацию — стрелочные функции нельзя
  // вызывать через `new`, поэтому implementation здесь обязана быть `function`.
  const PlayerConstructor = vi.fn(function PlayerConstructor() {
    return playerInstance
  }) as unknown as { new(): typeof playerInstance; isBrowserSupported: ReturnType<typeof vi.fn> }
  ;(PlayerConstructor as unknown as { isBrowserSupported: ReturnType<typeof vi.fn> }).isBrowserSupported = vi.fn(
    () => overrides.isBrowserSupported ?? true,
  )

  const Shaka = {
    polyfill: { installAll: vi.fn() },
    Player: PlayerConstructor,
  }

  return { Shaka: Shaka as unknown as UseShakaPlayerOptions['Shaka'], playerInstance, listeners }
}

function makeOptions(
  overrides: Partial<UseShakaPlayerOptions> = {},
  shakaOverrides?: Parameters<typeof createShakaMock>[0],
) {
  const container = document.createElement('div')
  const { Shaka, playerInstance, listeners } = createShakaMock(shakaOverrides)

  const options: UseShakaPlayerOptions = {
    src: '/video.mpd',
    containerRef: { current: container },
    audioRef: { current: null },
    usesSeparateAudioRef: { current: false },
    Shaka,
    ...overrides,
  }

  return { options, playerInstance, listeners, container }
}

describe('useShakaPlayer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('начальное состояние: isLoading === true, isVideoReady === false', () => {
    const { options } = makeOptions()
    const { result } = renderHook(() => useShakaPlayer(options))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isVideoReady).toBe(false)
  })

  it('ничего не инициализирует, если containerRef.current === null', () => {
    const { options } = makeOptions({ containerRef: { current: null } })
    renderHook(() => useShakaPlayer(options))
    // Shaka.Player не должен был вызваться как конструктор
    expect(options.Shaka.Player).not.toHaveBeenCalled()
  })

  it('ничего не инициализирует, если src пустой', () => {
    const { options } = makeOptions({ src: '' })
    renderHook(() => useShakaPlayer(options))
    expect(options.Shaka.Player).not.toHaveBeenCalled()
  })

  it('создаёт video-элемент в контейнере и подключает Shaka Player', () => {
    const { options, container, playerInstance } = makeOptions()
    renderHook(() => useShakaPlayer(options))

    expect(container.querySelector('video')).not.toBeNull()
    expect(options.Shaka.polyfill.installAll).toHaveBeenCalledTimes(1)
    expect(playerInstance.attach).toHaveBeenCalledTimes(1)
  })

  it('мьютит video при usesSeparateAudioRef.current === true', () => {
    const { options, container } = makeOptions({ usesSeparateAudioRef: { current: true } })
    renderHook(() => useShakaPlayer(options))

    const video = container.querySelector('video') as HTMLVideoElement
    expect(video.muted).toBe(true)
  })

  it('вызывает onError, если браузер не поддерживается', () => {
    const onError = vi.fn()
    const { options } = makeOptions({ onError }, { isBrowserSupported: false })
    renderHook(() => useShakaPlayer(options))

    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('вызывает player.load() с src и startTime', () => {
    const { options, playerInstance } = makeOptions({ src: '/x.mpd', startTime: 42 })
    renderHook(() => useShakaPlayer(options))

    expect(playerInstance.load).toHaveBeenCalledWith('/x.mpd', 42)
  })

  it('после успешной загрузки: isVideoReady=true, isLoading=false, вызывается onVideoReady/onDurationChange', async () => {
    const onVideoReady = vi.fn()
    const onDurationChange = vi.fn()
    const { options } = makeOptions({ onVideoReady, onDurationChange })

    const { result } = renderHook(() => useShakaPlayer(options))

    await waitFor(() => {
      expect(result.current.isVideoReady).toBe(true)
    })
    expect(result.current.isLoading).toBe(false)
    expect(onVideoReady).toHaveBeenCalledTimes(1)
    expect(onDurationChange).toHaveBeenCalledTimes(1)
  })

  it('вызывает onError при ошибке загрузки (кроме LOAD_INTERRUPTED)', async () => {
    const onError = vi.fn()
    const { options } = makeOptions(
      { onError },
      { loadImpl: () => Promise.reject(new Error('boom')) },
    )

    renderHook(() => useShakaPlayer(options))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  it('игнорирует ошибку LOAD_INTERRUPTED (code 7002) — onError не вызывается', async () => {
    const onError = vi.fn()
    const interrupted = { code: 7002 }
    const { options } = makeOptions(
      { onError },
      { loadImpl: () => Promise.reject(interrupted) },
    )

    renderHook(() => useShakaPlayer(options))

    // Даём микротаскам разрешиться
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onError).not.toHaveBeenCalled()
  })

  it('reload() вызывает unload() + load() заново', async () => {
    const { options, playerInstance } = makeOptions()
    const { result } = renderHook(() => useShakaPlayer(options))

    await waitFor(() => expect(result.current.isVideoReady).toBe(true))

    playerInstance.load.mockClear()
    playerInstance.unload.mockClear()

    await act(async () => {
      await result.current.reload()
    })

    expect(playerInstance.unload).toHaveBeenCalledTimes(1)
    expect(playerInstance.load).toHaveBeenCalledTimes(1)
  })

  it('cleanup при размонтировании вызывает player.unload/destroy и удаляет video из DOM', async () => {
    const { options, container, playerInstance } = makeOptions()
    const { result, unmount } = renderHook(() => useShakaPlayer(options))

    await waitFor(() => expect(result.current.isVideoReady).toBe(true))

    unmount()

    expect(playerInstance.unload).toHaveBeenCalled()
    expect(playerInstance.destroy).toHaveBeenCalledTimes(1)
    expect(container.querySelector('video')).toBeNull()
  })

  it('переинициализирует плеер при смене src', async () => {
    const { options, container } = makeOptions({ src: '/first.mpd' })
    const { rerender } = renderHook((props: UseShakaPlayerOptions) => useShakaPlayer(props), {
      initialProps: options,
    })

    const firstVideo = container.querySelector('video')

    await act(async () => {
      rerender({ ...options, src: '/second.mpd' })
      await Promise.resolve()
    })

    // старый video удалён, создан новый (объекты video должны отличаться)
    const secondVideo = container.querySelector('video')
    expect(secondVideo).not.toBe(firstVideo)
  })
})
