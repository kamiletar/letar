/**
 * useMobilePlayer — хук для воспроизведения видео на мобильных устройствах
 *
 * Использует нативный HTML5 video для progressive download.
 * Поддерживает раздельные аудиодорожки с автоматической синхронизацией.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** Порог рассинхронизации аудио (секунды) */
const AUDIO_SYNC_THRESHOLD = 0.3

export interface UseMobilePlayerOptions {
  /** URL видео */
  videoUrl: string | null
  /** URL аудио (для раздельных дорожек) */
  audioUrl: string | null
  /** Начальное время воспроизведения */
  startTime?: number
  /** Callback при изменении времени */
  onTimeUpdate?: (currentTime: number) => void
  /** Callback при изменении duration */
  onDurationChange?: (duration: number) => void
  /** Callback при окончании видео */
  onEnded?: () => void
  /** Callback при ошибке */
  onError?: (error: Error) => void
}

export interface UseMobilePlayerReturn {
  /** Ref для контейнера видео */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Ref для video элемента */
  videoRef: React.MutableRefObject<HTMLVideoElement | null>
  /** Ref для audio элемента */
  audioRef: React.RefObject<HTMLAudioElement | null>
  /** Идёт воспроизведение */
  isPlaying: boolean
  /** Текущее время */
  currentTime: number
  /** Длительность */
  duration: number
  /** Идёт загрузка */
  isLoading: boolean
  /** Готов к воспроизведению */
  isReady: boolean
  /** Воспроизвести/пауза */
  togglePlay: () => void
  /** Перемотка на время */
  seek: (time: number) => void
  /** Перемотка на +/- секунды */
  skip: (seconds: number) => void
}

export function useMobilePlayer(options: UseMobilePlayerOptions): UseMobilePlayerReturn {
  const { videoUrl, audioUrl, startTime = 0, onTimeUpdate, onDurationChange, onEnded, onError } = options

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Refs для callback'ов — чтобы избежать пересоздания video при изменении callback'ов
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onDurationChangeRef = useRef(onDurationChange)
  const onEndedRef = useRef(onEnded)
  const onErrorRef = useRef(onError)

  // Обновляем refs при изменении callback'ов
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate
  }, [onTimeUpdate])
  useEffect(() => {
    onDurationChangeRef.current = onDurationChange
  }, [onDurationChange])
  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)

  // Флаг использования раздельного аудио
  const usesSeparateAudio = !!audioUrl

  // Инициализация нативного video элемента
  useEffect(() => {
    if (!videoUrl || !containerRef.current) {
      return
    }

    // Сброс состояния
    setIsReady(false)
    setIsLoading(true)
    setIsPlaying(false)

    let isMounted = true
    let loadTimeoutId: ReturnType<typeof setTimeout> | null = null

    // Создаём video элемент
    const video = document.createElement('video')
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = 'contain'
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    // Атрибуты для мобильных браузеров
    video.setAttribute('webkit-playsinline', 'true')
    video.setAttribute('x5-playsinline', 'true')
    video.setAttribute('x5-video-player-type', 'h5')
    video.setAttribute('x5-video-player-fullscreen', 'true')
    // Мьютим если есть отдельное аудио
    video.muted = usesSeparateAudio

    containerRef.current.appendChild(video)
    videoRef.current = video

    // Таймаут загрузки — если за 30 сек видео не загрузилось, показываем ошибку
    loadTimeoutId = setTimeout(() => {
      if (!isMounted) {
        return
      }
      // Проверяем readyState напрямую (0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)
      if (video.readyState < 2) {
        console.error('[MobilePlayer] Load timeout — video may be unsupported codec', {
          readyState: video.readyState,
          networkState: video.networkState,
        })
        setIsLoading(false)
        onErrorRef.current?.(
          new Error('Не удалось загрузить видео. Возможно, формат не поддерживается вашим браузером (AV1).'),
        )
      }
    }, 30000)

    // Обработка событий загрузки
    const handleLoadedMetadata = () => {
      if (!isMounted) {
        return
      }
      setDuration(video.duration)
      onDurationChangeRef.current?.(video.duration)

      // Установить начальное время
      if (startTime > 0) {
        video.currentTime = startTime
      }
    }

    const handleLoadedData = () => {
      if (!isMounted) {
        return
      }
      // Первый кадр загружен — можно считать видео готовым
      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId)
        loadTimeoutId = null
      }
      setIsReady(true)
      setIsLoading(false)
    }

    const handleError = () => {
      if (!isMounted) {
        return
      }
      const error = video.error
      console.error('[MobilePlayer] Video error:', {
        code: error?.code,
        message: error?.message,
        MEDIA_ERR_ABORTED: error?.code === 1,
        MEDIA_ERR_NETWORK: error?.code === 2,
        MEDIA_ERR_DECODE: error?.code === 3,
        MEDIA_ERR_SRC_NOT_SUPPORTED: error?.code === 4,
      })

      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId)
        loadTimeoutId = null
      }

      setIsLoading(false)

      // Понятные сообщения об ошибках
      let errorMessage = 'Ошибка воспроизведения видео'
      if (error?.code === 3) {
        errorMessage = 'Не удалось декодировать видео. Формат может не поддерживаться вашим браузером.'
      } else if (error?.code === 4) {
        errorMessage = 'Формат видео не поддерживается вашим браузером (возможно, AV1).'
      } else if (error?.code === 2) {
        errorMessage = 'Ошибка сети при загрузке видео.'
      }

      onErrorRef.current?.(new Error(errorMessage))
    }

    const handleWaiting = () => {
      if (!isMounted) {
        return
      }
      setIsLoading(true)
    }

    const handleCanPlay = () => {
      if (!isMounted) {
        return
      }
      setIsLoading(false)
    }

    const handleCanPlayThrough = () => {
      if (!isMounted) {
        return
      }
      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId)
        loadTimeoutId = null
      }
      setIsReady(true)
      setIsLoading(false)
    }

    const handleStalled = () => {
      if (!isMounted) {
        return
      }
      console.warn('[MobilePlayer] stalled — media data is not forthcoming')
    }

    const handleSuspend = () => {
      if (!isMounted) {
        return
      }
      // Загрузка намеренно остановлена браузером
    }

    const handleProgress = () => {
      if (!isMounted) {
        return
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('error', handleError)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('canplaythrough', handleCanPlayThrough)
    video.addEventListener('stalled', handleStalled)
    video.addEventListener('suspend', handleSuspend)
    video.addEventListener('progress', handleProgress)

    // Загружаем видео
    video.src = videoUrl

    // Cleanup
    return () => {
      isMounted = false
      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId)
      }
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('error', handleError)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('canplaythrough', handleCanPlayThrough)
      video.removeEventListener('stalled', handleStalled)
      video.removeEventListener('suspend', handleSuspend)
      video.removeEventListener('progress', handleProgress)
      video.pause()
      video.src = ''
      video.remove()
      videoRef.current = null
    }
  }, [videoUrl, startTime, usesSeparateAudio]) // НЕ добавлять isReady — вызовет бесконечный цикл

  // Синхронизация аудио
  useEffect(() => {
    if (!isReady || !usesSeparateAudio) {
      return
    }

    const video = videoRef.current
    const audio = audioRef.current
    if (!video || !audio) {
      return
    }

    // Синхронизация времени
    const syncAudio = () => {
      if (Math.abs(audio.currentTime - video.currentTime) > AUDIO_SYNC_THRESHOLD) {
        audio.currentTime = video.currentTime
      }
    }

    const handlePlay = async () => {
      setIsPlaying(true)
      audio.currentTime = video.currentTime

      // Дождаться загрузки audio если не готово (readyState: HAVE_FUTURE_DATA = 3)
      if (audio.readyState < 3) {
        await new Promise<void>((resolve) => {
          const onCanPlay = () => {
            audio.removeEventListener('canplay', onCanPlay)
            resolve()
          }
          audio.addEventListener('canplay', onCanPlay)
          // Fallback timeout на случай если событие не придёт
          setTimeout(() => {
            audio.removeEventListener('canplay', onCanPlay)
            resolve()
          }, 2000)
        })
        // Пересинхронизировать время после ожидания
        audio.currentTime = video.currentTime
      }

      audio.play().catch((err: unknown) => console.warn('[MobilePlayer] Audio play failed:', err))
    }

    const handlePause = () => {
      setIsPlaying(false)
      audio.pause()
    }

    const handleSeeked = () => {
      audio.currentTime = video.currentTime
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdateRef.current?.(video.currentTime)
      syncAudio()
    }

    const handleEnded = () => {
      setIsPlaying(false)
      audio.pause()
      onEndedRef.current?.()
    }

    // Начальная синхронизация
    audio.volume = 1
    audio.muted = false
    audio.currentTime = video.currentTime

    // Подписка на события
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [isReady, usesSeparateAudio]) // Убрали callback'и из dependencies!

  // Обработчики событий для видео БЕЗ раздельного аудио
  useEffect(() => {
    if (!isReady || usesSeparateAudio) {
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdateRef.current?.(video.currentTime)
    }
    const handleEnded = () => {
      setIsPlaying(false)
      onEndedRef.current?.()
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [isReady, usesSeparateAudio]) // Убрали callback'и из dependencies!

  // Методы управления
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    if (video.paused) {
      // play() возвращает Promise — обрабатываем AbortError при быстром play/pause
      video.play().catch((err: Error) => {
        // AbortError — нормальная ситуация при быстром переключении play/pause
        if (err.name !== 'AbortError') {
          console.warn('[MobilePlayer] Video play failed:', err)
        }
      })
    } else {
      video.pause()
    }
  }, [])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    const audio = audioRef.current
    if (!video) {
      return
    }

    const clampedTime = Math.max(0, Math.min(time, video.duration || 0))
    video.currentTime = clampedTime
    if (audio) {
      audio.currentTime = clampedTime
    }
    setCurrentTime(clampedTime)
  }, [])

  const skip = useCallback(
    (seconds: number) => {
      const video = videoRef.current
      if (!video) {
        return
      }
      seek(video.currentTime + seconds)
    },
    [seek],
  )

  return {
    containerRef,
    videoRef,
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    isReady,
    togglePlay,
    seek,
    skip,
  }
}
