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

/**
 * Вариант-трек Shaka Player. В режиме `src=` (прямой URL, не DASH/HLS-манифест — наш случай для
 * локальных MKV) Shaka проксирует нативные `HTMLMediaElement.audioTracks` браузера как
 * variant-треки: у файла с N встроенными аудиодорожками и одной видеодорожкой получаем N
 * вариантов с одинаковым `videoId`/различным `audioId`. См. `useAudioTracks.ts`.
 */
export interface ShakaTrack {
  id: number
  active: boolean
  language: string
  audioId: number | null
  videoId: number | null
  /**
   * Нативный `AudioTrack.id` браузера (строка) — в режиме `src=` Shaka не заполняет числовой
   * `audioId` вовсе (см. `useAudioTracks.ts`), реальный стабильный идентификатор дорожки лежит
   * только здесь.
   */
  originalAudioId: string | null
  originalVideoId: string | null
  label: string | null
  roles: string[]
}

export interface ShakaPlayerInstance {
  attach: (video: HTMLVideoElement) => void
  load: (url: string, startTime?: number, mimeType?: string) => Promise<void>
  unload: () => Promise<void>
  destroy: () => void
  addEventListener: (event: string, callback: (event: unknown) => void) => void
  removeEventListener: (event: string, callback: (event: unknown) => void) => void
  /** Все варианты (видео×аудио комбинации) текущей загрузки — источник данных для выбора аудиодорожки */
  getVariantTracks: () => ShakaTrack[]
  /** Переключить на другой вариант — `clearBuffer: true` даёт мгновенный эффект вместо ожидания конца буфера */
  selectVariantTrack: (track: ShakaTrack, clearBuffer?: boolean) => void
}

export interface UseShakaPlayerOptions {
  /** URL или путь к видеофайлу */
  src: string
  /**
   * Явный MIME-тип — заставляет Shaka пропустить сетевое определение типа манифеста (DASH/HLS)
   * и сразу перейти в нативный режим `src=`. Обязателен для `blob:`-URL на `MediaSource`
   * (потоковая подготовка Hi10P, см. `use-transcode-stream.ts` в animatrona-folder-player):
   * такой URL не отдаёт контент по сетевому запросу, sniffing на нём не сработает.
   */
  mimeType?: string
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
    mimeType,
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

  // startTime нужен только как точка старта в момент (пере)загрузки src — если держать его в
  // deps эффекта ниже, плеер будет полностью пересоздаваться при каждом изменении ЗНАЧЕНИЯ
  // startTime, а не только при смене видео. У потребителей (animatrona-folder-player,
  // animatrona-tracker) это число обычно приходит из позиции просмотра, которая фоново
  // пересчитывается во время самого воспроизведения (автосохранение прогресса раз в несколько
  // секунд) — без снапшота через ref это выглядит как «видео играет пару секунд, потом спиннер,
  // потом продолжает с той же позиции»: полный unload/destroy/пересоздание video-элемента и
  // повторный player.load() посреди штатного проигрывания. Найдено 2026-09-08.
  const startTimeRef = useRef(startTime)
  useEffect(() => {
    startTimeRef.current = startTime
  }, [startTime])

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
      await player.load(src, startTimeRef.current, mimeType)

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
  }, [src, mimeType, autoPlay, onError, onDurationChange, onVideoReady])

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
        await player.load(src, startTimeRef.current, mimeType)

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
    mimeType,
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
