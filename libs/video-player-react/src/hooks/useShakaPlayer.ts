/**
 * useShakaPlayer — хук для инициализации и управления Shaka Player
 *
 * Принимает Shaka Player класс как параметр для динамической загрузки
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { MutableRefObject, RefObject } from 'react'

/** Интерфейс Shaka Player (минимальный для типизации) */
interface ShakaPlayerInterface {
  polyfill: {
    installAll: () => void
  }
  Player: {
    new(): ShakaPlayerInstance
    isBrowserSupported: () => boolean
  }
}

interface ShakaPlayerInstance {
  attach: (video: HTMLVideoElement) => void
  load: (url: string, startTime?: number) => Promise<void>
  unload: () => Promise<void>
  destroy: () => void
  addEventListener: (event: string, callback: (event: unknown) => void) => void
  removeEventListener: (event: string, callback: (event: unknown) => void) => void
}

export interface UseShakaPlayerOptions {
  /** URL или путь к видеофайлу */
  src: string
  /** Время начала воспроизведения */
  startTime?: number
  /** Автоматическое воспроизведение */
  autoPlay?: boolean
  /** Контейнер для video элемента */
  containerRef: RefObject<HTMLDivElement | null>
  /** Ref для audio элемента (раздельные дорожки) */
  audioRef: RefObject<HTMLAudioElement | null>
  /** Используются ли раздельные аудиодорожки */
  usesSeparateAudioRef: MutableRefObject<boolean>
  /** Shaka Player модуль */
  Shaka: ShakaPlayerInterface
  /** Callback при ошибке */
  onError?: (error: Error) => void
  /** Callback при изменении duration */
  onDurationChange?: (duration: number) => void
  /** Callback при готовности видео */
  onVideoReady?: () => void
}

export interface UseShakaPlayerReturn {
  /** Ref на video элемент */
  videoRef: MutableRefObject<HTMLVideoElement | null>
  /** Ref на Shaka Player */
  playerRef: MutableRefObject<ShakaPlayerInstance | null>
  /** Видео загружено и готово к воспроизведению */
  isVideoReady: boolean
  /** Идёт загрузка */
  isLoading: boolean
  /** Перезагрузить видео */
  reload: () => Promise<void>
}

/**
 * Хук для инициализации Shaka Player
 */
export function useShakaPlayer(options: UseShakaPlayerOptions): UseShakaPlayerReturn {
  const {
    src,
    startTime = 0,
    autoPlay = false,
    containerRef,
    audioRef,
    usesSeparateAudioRef,
    Shaka,
    onError,
    onDurationChange,
    onVideoReady,
  } = options

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<ShakaPlayerInstance | null>(null)

  // State
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Reload функция
  const reload = useCallback(async () => {
    const player = playerRef.current
    const video = videoRef.current
    if (!player || !video || !src) {
      return
    }

    setIsLoading(true)
    try {
      await player.unload()
      await player.load(src, startTime)

      onDurationChange?.(video.duration)
      setIsVideoReady(true)
      onVideoReady?.()

      if (autoPlay) {
        video.play()
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)))
    } finally {
      setIsLoading(false)
    }
  }, [src, startTime, autoPlay, onError, onDurationChange, onVideoReady])

  // Инициализация Shaka Player
  useEffect(() => {
    const container = containerRef.current
    if (!container || !src) {
      return
    }

    // Сбрасываем состояние
    setIsVideoReady(false)
    setIsLoading(true)

    // Флаг для отмены обработки после unmount
    let isMounted = true

    // Создаём video элемент программно
    const video = document.createElement('video')
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = 'contain'
    video.crossOrigin = 'anonymous'
    video.onclick = (e) => e.stopPropagation()

    // В режиме раздельных дорожек video.muted = true
    video.muted = usesSeparateAudioRef.current

    // Добавляем в DOM и сохраняем ref
    container.appendChild(video)
    videoRef.current = video

    // Устанавливаем полифиллы Shaka
    Shaka.polyfill.installAll()

    // Проверяем поддержку браузера
    if (!Shaka.Player.isBrowserSupported()) {
      console.error('[useShakaPlayer] Browser not supported')
      onError?.(new Error('Browser not supported'))
      return
    }

    // Создаём плеер
    const player = new Shaka.Player()
    player.attach(video)
    playerRef.current = player

    // Обработка ошибок Shaka
    player.addEventListener('error', (event) => {
      if (!isMounted) {
        return
      }
      const error = (event as { detail?: { message?: string } }).detail
      console.error('[useShakaPlayer] Shaka error:', error)
      onError?.(new Error(error?.message || 'Playback error'))
    })

    // Загрузка источника
    const loadSource = async () => {
      try {
        await player.load(src, startTime)

        if (!isMounted) {
          return
        }

        // Обновляем duration
        onDurationChange?.(video.duration)

        // Начальная синхронизация audio после загрузки видео
        const audio = audioRef.current
        if (usesSeparateAudioRef.current && audio) {
          audio.volume = video.volume
          audio.muted = false
          audio.playbackRate = video.playbackRate
          audio.currentTime = video.currentTime
        }

        // Сигнализируем о готовности
        setIsVideoReady(true)
        setIsLoading(false)
        onVideoReady?.()

        if (autoPlay) {
          video.play()
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        // Игнорируем LOAD_INTERRUPTED (code 7002)
        const shakaError = error as { code?: number }
        if (shakaError.code === 7002) {
          return
        }

        console.error('[useShakaPlayer] Load error:', error)
        setIsLoading(false)
        onError?.(error instanceof Error ? error : new Error(String(error)))
      }
    }

    loadSource()

    // Сохраняем текущее значение ref для использования в cleanup
    const currentAudio = audioRef.current

    // Cleanup
    return () => {
      isMounted = false
      setIsVideoReady(false)

      // Останавливаем воспроизведение
      video.pause()
      currentAudio?.pause()

      // Unload и destroy
      player.unload()
      player.destroy()

      // Удаляем video element из DOM
      video.remove()

      // Очищаем refs
      videoRef.current = null
      playerRef.current = null
    }
  }, [
    src,
    startTime,
    autoPlay,
    containerRef,
    audioRef,
    usesSeparateAudioRef,
    Shaka,
    onError,
    onDurationChange,
    onVideoReady,
  ])

  return {
    videoRef,
    playerRef,
    isVideoReady,
    isLoading,
    reload,
  }
}
