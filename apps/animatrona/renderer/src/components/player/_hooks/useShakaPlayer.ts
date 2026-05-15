/**
 * useShakaPlayer — хук для инициализации и управления Shaka Player
 *
 * Инкапсулирует:
 * - Программное создание video элемента
 * - Инициализацию Shaka Player
 * - Загрузку источника видео
 * - Lifecycle management (cleanup)
 *
 * Решает проблему:
 * - videoRef.current устанавливается программно внутри useEffect
 * - React refs не вызывают re-render, поэтому хуки не перезапускаются
 * - Возвращаем isVideoReady state для сигнализации готовности
 */

import { useEffect, useRef, useState } from 'react'
import shaka from 'shaka-player'

import type { MutableRefObject, RefObject } from 'react'

import { toPlayableUrl } from '@/lib/media-url'

export interface UseShakaPlayerOptions {
  /** Путь к видеофайлу */
  src: string
  /** Время начала воспроизведения */
  startTime?: number
  /** Автоматическое воспроизведение */
  autoPlay?: boolean
  /** Контейнер для video элемента */
  videoContainerRef: RefObject<HTMLDivElement | null>
  /** Ref для audio элемента (раздельные дорожки) */
  audioRef: RefObject<HTMLAudioElement | null>
  /** Используются ли раздельные аудиодорожки */
  usesSeparateAudioRef: MutableRefObject<boolean>
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
  playerRef: MutableRefObject<shaka.Player | null>
  /** Видео загружено и готово к воспроизведению */
  isVideoReady: boolean
  /** Идёт загрузка */
  isLoading: boolean
}

/**
 * Хук для инициализации Shaka Player
 */
export function useShakaPlayer(options: UseShakaPlayerOptions): UseShakaPlayerReturn {
  const {
    src,
    startTime = 0,
    autoPlay = false,
    videoContainerRef,
    audioRef,
    usesSeparateAudioRef,
    onError,
    onDurationChange,
    onVideoReady,
  } = options

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<shaka.Player | null>(null)

  // Стабильные рефы для коллбэков — НЕ должны перезапускать плеер при изменении
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const onDurationChangeRef = useRef(onDurationChange)
  onDurationChangeRef.current = onDurationChange
  const onVideoReadyRef = useRef(onVideoReady)
  onVideoReadyRef.current = onVideoReady

  // State
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Инициализация Shaka Player
  useEffect(() => {
    const videoContainer = videoContainerRef.current
    if (!videoContainer) {
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
    videoContainer.appendChild(video)
    videoRef.current = video

    // Устанавливаем полифиллы Shaka
    shaka.polyfill.installAll()

    // Проверяем поддержку браузера
    if (!shaka.Player.isBrowserSupported()) {
      console.error('[useShakaPlayer] Browser not supported')
      onErrorRef.current?.(new Error('Browser not supported'))
      return
    }

    // Создаём плеер
    const player = new shaka.Player()
    player.attach(video)
    playerRef.current = player

    // Обработка ошибок Shaka
    player.addEventListener('error', (event) => {
      if (!isMounted) {
        return
      }
      const error = (event as unknown as { detail: shaka.util.Error }).detail
      console.error('[useShakaPlayer] Shaka error:', error)
      onErrorRef.current?.(new Error(error.message || 'Playback error'))
    })

    // Загрузка источника
    const loadSource = async () => {
      try {
        const mediaUrl = toPlayableUrl({ path: src })
        if (!mediaUrl) {
          throw new Error('Invalid video source')
        }
        await player.load(mediaUrl, startTime)

        if (!isMounted) {
          return
        }

        // Обновляем duration
        onDurationChangeRef.current?.(video.duration)

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
        onVideoReadyRef.current?.()

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
        onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)))
      }
    }

    loadSource()

    // Cleanup
    return () => {
      isMounted = false
      setIsVideoReady(false)

      // Останавливаем воспроизведение
      video.pause()
      audioRef.current?.pause()

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
    videoContainerRef,
    audioRef,
    usesSeparateAudioRef,
    // Коллбэки через рефы — не перезапускают плеер при изменении
  ])

  return {
    videoRef,
    playerRef,
    isVideoReady,
    isLoading,
  }
}
