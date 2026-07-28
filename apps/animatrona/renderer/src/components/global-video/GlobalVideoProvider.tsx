'use client'

/**
 * GlobalVideoProvider — persistent видеоплеер на уровне layout
 *
 * Создаёт video + audio elements ОДИН РАЗ. Они живут в layout и
 * НИКОГДА не уничтожаются при навигации между страницами.
 *
 * Shaka Player загружает контент когда store.src меняется.
 * Video element перемещается между контейнерами через appendChild():
 * - WatchPage → VideoPlayer container (mode === 'embedded')
 * - MiniPlayer container (mode === 'mini')
 *
 * Это решает ВСЕ проблемы с MediaSource closure, position reset,
 * audio sync race conditions — потому что элементы не пересоздаются.
 */

import { useEffect, useRef } from 'react'

import { toPlayableUrl } from '@/lib/media-url'

import { useGlobalVideoStore } from './global-video-store'

import type { ReactNode } from 'react'
import type Shaka from 'shaka-player'

interface GlobalVideoProviderProps {
  children: ReactNode
}

/**
 * Provider для глобального видео — рендерится в layout.tsx
 */
export function GlobalVideoProvider({ children }: GlobalVideoProviderProps) {
  const playerRef = useRef<Shaka.Player | null>(null)
  const prevSrcRef = useRef<string | null>(null)

  // Подписка на изменение src — загрузка нового видео
  const src = useGlobalVideoStore((s) => s.src)
  const audioSrc = useGlobalVideoStore((s) => s.audioSrc)

  // Создание persistent video + audio elements
  useEffect(() => {
    // shaka-player при статическом импорте ссылается на `self` в топ-левел коде — падает при
    // Next.js SSR/prerender (нет `self` в Node). Динамический import() выполняется только
    // здесь, внутри useEffect — то есть строго в браузере, уже после гидратации.
    let cancelled = false
    let cleanup: (() => void) | undefined

    void (async () => {
      const shaka = (await import('shaka-player')).default
      if (cancelled) {
        return
      }

      // Video element — создаётся один раз на весь жизненный цикл приложения
      const video = document.createElement('video')
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.objectFit = 'contain'
      video.crossOrigin = 'anonymous'
      video.onclick = (e) => e.stopPropagation()

      // Audio element — для отдельных аудиодорожек
      const audio = document.createElement('audio')

      // Shaka Player
      shaka.polyfill.installAll()
      const player = new shaka.Player()
      player.attach(video)
      playerRef.current = player

      // IPFS gateway возвращает application/octet-stream — подменяем на video/webm
      const networkingEngine = player.getNetworkingEngine()
      if (networkingEngine) {
        networkingEngine.registerResponseFilter((_type, response) => {
          const headers = response.headers
          if (headers && headers['content-type'] === 'application/octet-stream') {
            headers['content-type'] = 'video/webm'
          }
        })
      }

      // Обработка ошибок
      const onShakaError = (event: Event) => {
        const error = (event as unknown as { detail: Shaka.util.Error }).detail
        console.error('[GlobalVideoProvider] Shaka error:', error)
      }
      player.addEventListener('error', onShakaError)

      // Timeupdate → синхронизация store (throttle 250ms — снижаем ререндеры подписчиков)
      let lastTimeUpdate = 0
      const onTimeUpdate = () => {
        const now = performance.now()
        if (now - lastTimeUpdate > 250) {
          lastTimeUpdate = now
          useGlobalVideoStore.getState().updateTime(video.currentTime)
        }
      }
      const onDurationChange = () => {
        useGlobalVideoStore.getState().updateDuration(video.duration)
      }
      const onPlay = () => {
        useGlobalVideoStore.getState().updatePlayingState(true)
      }
      const onPause = () => {
        useGlobalVideoStore.getState().updatePlayingState(false)
      }

      video.addEventListener('timeupdate', onTimeUpdate)
      video.addEventListener('durationchange', onDurationChange)
      video.addEventListener('play', onPlay)
      video.addEventListener('pause', onPause)

      // Сохраняем в store
      useGlobalVideoStore.getState().setVideoElement(video)
      useGlobalVideoStore.getState().setAudioElement(audio)

      cleanup = () => {
        player.removeEventListener('error', onShakaError)
        video.removeEventListener('timeupdate', onTimeUpdate)
        video.removeEventListener('durationchange', onDurationChange)
        video.removeEventListener('play', onPlay)
        video.removeEventListener('pause', onPause)
        player.destroy()
        video.remove()
        audio.remove()
        playerRef.current = null
        useGlobalVideoStore.getState().setVideoElement(null)
        useGlobalVideoStore.getState().setAudioElement(null)
      }
    })()

    return () => {
      // Cleanup при размонтировании layout (закрытие приложения)
      cancelled = true
      cleanup?.()
    }
  }, []) // Пустые deps — создаём один раз

  // Загрузка видео при изменении src
  useEffect(() => {
    const player = playerRef.current
    const video = useGlobalVideoStore.getState().videoElement
    if (!player || !video || !src) {
      return
    }

    // Не перезагружаем если src не изменился
    if (src === prevSrcRef.current) {
      return
    }
    prevSrcRef.current = src

    const mediaUrl = toPlayableUrl({ path: src })
    if (!mediaUrl) {
      return
    }

    const { currentTime: startTime } = useGlobalVideoStore.getState()

    player
      .load(mediaUrl, startTime)
      .then(() => {
        useGlobalVideoStore.getState().updateDuration(video.duration)
      })
      .catch((error: unknown) => {
        // Игнорируем LOAD_INTERRUPTED
        const shakaError = error as { code?: number }
        if (shakaError.code === 7002) {
          return
        }
        console.error('[GlobalVideoProvider] Load error:', error)
      })
  }, [src])

  // Синхронизация отдельной аудиодорожки
  useEffect(() => {
    const audio = useGlobalVideoStore.getState().audioElement
    const video = useGlobalVideoStore.getState().videoElement
    if (!audio) {
      return
    }

    if (!audioSrc) {
      audio.pause()
      audio.removeAttribute('src')
      return
    }

    audio.src = audioSrc

    // Синхронизация play/pause/seek
    if (!video) {
      return
    }

    // Mute видео когда есть отдельная дорожка
    video.muted = true

    const syncPlay = () => {
      audio.currentTime = video.currentTime
      audio.play().catch(() => {
        /* авто-воспроизведение может быть отклонено */
      })
    }
    const syncPause = () => audio.pause()
    const syncSeek = () => {
      if (Math.abs(audio.currentTime - video.currentTime) > 0.5) {
        audio.currentTime = video.currentTime
      }
      // Возобновляем audio после seek если видео играет
      if (!video.paused && audio.paused) {
        audio.play().catch(() => {
          /* seek recovery */
        })
      }
    }

    // Начальная синхронизация при загрузке аудио
    const onLoadedData = () => {
      audio.currentTime = video.currentTime
      audio.volume = video.volume
      if (!video.paused) {
        audio.play().catch(() => {
          /* авто-воспроизведение может быть отклонено */
        })
      }
    }

    audio.addEventListener('loadeddata', onLoadedData)
    video.addEventListener('play', syncPlay)
    video.addEventListener('pause', syncPause)
    video.addEventListener('seeked', syncSeek)

    return () => {
      audio.removeEventListener('loadeddata', onLoadedData)
      video.removeEventListener('play', syncPlay)
      video.removeEventListener('pause', syncPause)
      video.removeEventListener('seeked', syncSeek)
      // Восстанавливаем звук видео когда нет отдельной дорожки
      video.muted = false
    }
  }, [audioSrc])

  return <>{children}</>
}
