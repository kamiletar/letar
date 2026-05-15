/**
 * Хук инициализации Shaka Player
 *
 * Управляет: динамический импорт shaka-player, создание video элемента,
 * загрузка манифеста, базовые события playback (play/pause/timeupdate/etc),
 * определение первого кадра для корректного показа/скрытия лоадера.
 */

import { type RefObject, useEffect, useRef, useState } from 'react'

interface UseShakaPlayerOptions {
  /** URL видео (DASH/HLS/MP4) */
  videoUrl: string | null
  /** Начальное время (секунды) */
  startTime?: number
  /** Ref на контейнер для вставки video элемента */
  containerRef: RefObject<HTMLDivElement | null>
  /** Нужен ли отдельный audio (mute видео) */
  usesSeparateAudio: boolean
  /** Начальная длительность из манифеста */
  initialDuration?: number
}

interface UseShakaPlayerReturn {
  /** Ref на video элемент */
  videoRef: RefObject<HTMLVideoElement | null>
  /** Загружается ли видео */
  isLoading: boolean
  /** Ошибка воспроизведения */
  error: string | null
  /** Видео готово к воспроизведению */
  isVideoReady: boolean
  /** Играет ли видео */
  isPlaying: boolean
  /** Текущее время (секунды) */
  currentTime: number
  /** Длительность (секунды) */
  duration: number
  /** Громкость (0-1) */
  volume: number
  /** Замьючено */
  isMuted: boolean
  /** Заблокирован ли autoplay */
  isVideoBlocked: boolean
  /** Установить isVideoBlocked */
  setIsVideoBlocked: (v: boolean) => void
  /** Установить isLoading */
  setIsLoading: (v: boolean) => void
}

/** Ждём реальный первый кадр видео */
function waitForFirstFrame(video: HTMLVideoElement, cb: () => void): void {
  const videoEl = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }
  if (videoEl.requestVideoFrameCallback) {
    videoEl.requestVideoFrameCallback(() => cb())
  } else {
    const onTimeUpdate = () => {
      if (videoEl.currentTime > 0) {
        videoEl.removeEventListener('timeupdate', onTimeUpdate)
        cb()
      }
    }
    videoEl.addEventListener('timeupdate', onTimeUpdate)
  }
}

export function useShakaPlayer({
  videoUrl,
  startTime = 0,
  containerRef,
  usesSeparateAudio,
  initialDuration = 0,
}: UseShakaPlayerOptions): UseShakaPlayerReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [shakaModule, setShakaModule] = useState<unknown>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(initialDuration)
  const [volume, setVolumeState] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoBlocked, setIsVideoBlocked] = useState(false)

  // Динамический импорт Shaka Player
  useEffect(() => {
    let cancelled = false
    import('shaka-player')
      .then((mod) => {
        if (!cancelled) {
          setShakaModule(mod.default)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(`Ошибка загрузки Shaka Player: ${err.message}`)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Инициализация Shaka + video элемент
  useEffect(() => {
    const container = containerRef.current
    const Shaka = shakaModule as any
    if (!container || !Shaka || !videoUrl) {
      return
    }

    setIsLoading(true)
    setIsVideoReady(false)
    let isMounted = true

    const video = document.createElement('video')
    video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;z-index:1'
    video.crossOrigin = 'anonymous'
    video.muted = usesSeparateAudio
    container.appendChild(video)
    videoRef.current = video

    Shaka.polyfill.installAll()
    if (!Shaka.Player.isBrowserSupported()) {
      setError('Браузер не поддерживается')
      return
    }

    const player = new Shaka.Player()
    player.attach(video)
    player.addEventListener('error', (event: { detail?: { message?: string } }) => {
      if (isMounted) {
        setError(event.detail?.message || 'Ошибка воспроизведения')
      }
    })

    let firstFrameShown = false

    const loadSource = async () => {
      try {
        await player.load(videoUrl, startTime)
        if (!isMounted) {
          return
        }
        if (isFinite(video.duration) && video.duration > 0) {
          setDuration(video.duration)
        }
        setIsVideoReady(true)
        video.play().catch((err) => {
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            setIsVideoBlocked(true)
          }
        })

        waitForFirstFrame(video, () => {
          firstFrameShown = true
          if (isMounted) {
            setIsLoading(false)
          }
        })
      } catch (err) {
        if (!isMounted) {
          return
        }
        if ((err as any).code === 7002) {
          return
        }
        setIsLoading(false)
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    loadSource()

    const handlePlay = () => isMounted && setIsPlaying(true)
    const handlePause = () => isMounted && setIsPlaying(false)
    const handleTimeUpdate = () => isMounted && setCurrentTime(video.currentTime)
    const handleDurationChange = () => {
      if (isMounted && isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration)
      }
    }
    const handleVolumeChange = () => {
      if (isMounted) {
        setVolumeState(video.volume)
        setIsMuted(video.muted)
      }
    }
    const handleWaiting = () => {
      if (isMounted && firstFrameShown) {
        setIsLoading(true)
      }
    }
    const handleCanPlay = () => {
      if (isMounted && firstFrameShown) {
        setIsLoading(false)
      }
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)

    return () => {
      isMounted = false
      setIsVideoReady(false)
      video.pause()
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      player.unload()
      player.destroy()
      video.remove()
      videoRef.current = null
    }
  }, [shakaModule, videoUrl])

  return {
    videoRef,
    isLoading,
    error,
    isVideoReady,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isVideoBlocked,
    setIsVideoBlocked,
    setIsLoading,
  }
}
