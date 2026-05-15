/**
 * Страница плеера — воспроизведение эпизода
 *
 * Функции:
 * - Воспроизведение видео через HTML5 video
 * - Синхронизация раздельных аудиодорожек
 * - Автосохранение прогресса (каждые 5 сек)
 * - Skip OP/ED кнопки (по главам)
 * - Автопереход на следующий эпизод
 * - Выбор аудио/субтитров
 * - Double-tap жесты для перемотки
 * - Swipe-жесты для громкости/яркости/seek
 * - Picture-in-Picture
 * - Скорость воспроизведения
 * - Screen Wake Lock
 */

import { Box, Flex, IconButton, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LuArrowLeft,
  LuCheck,
  LuGauge,
  LuMaximize,
  LuMinimize,
  LuPause,
  LuPlay,
  LuRotateCcw,
  LuRotateCw,
  LuSettings,
  LuX,
} from 'react-icons/lu'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { SubtitleOverlay } from '@letar/video-player-react'

import {
  type AnimeDetails,
  type AudioTrack,
  type Chapter,
  type Episode,
  getAnimeDetails,
  getAudioCidUrl,
  getEpisodeVideoUrl,
  getIpfsUrl,
  getSubtitleVttUrl,
  saveProgress,
  type SubtitleTrack,
} from '../api'
import { BufferProgress } from '../components/BufferProgress'
import { ControlsPanel } from '../components/ControlsPanel'
import { DoubleTapRipple } from '../components/DoubleTapRipple'
import { ErrorState } from '../components/ErrorState'
import { GestureIndicator, type GestureType } from '../components/GestureIndicator'
import { PiPButton } from '../components/PiPButton'
import { PlayOverlay } from '../components/PlayOverlay'
import { SeekPreview } from '../components/SeekPreview'
import { type PlaybackSpeed, SpeedSelector } from '../components/SpeedSelector'
import { useFullscreen } from '../hooks/useFullscreen'
import { useGestures } from '../hooks/useGestures'
import { useMobilePlayer } from '../hooks/useMobilePlayer'
import { usePiP } from '../hooks/usePiP'
import { useWakeLock } from '../hooks/useWakeLock'

/** Интервал автосохранения прогресса (5 сек) */
const SAVE_INTERVAL = 5000

/**
 * Компонент для нативных субтитров (VTT/SRT)
 * Добавляет <track> элемент к видео
 */
function NativeSubtitleTrack({
  videoRef,
  track,
}: {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>
  track: SubtitleTrack
}) {
  useEffect(() => {
    const video = videoRef.current
    if (!video || !track.fileCid) {
      return
    }

    // Удаляем старые треки
    while (video.textTracks.length > 0) {
      const existingTrack = video.querySelector('track')
      if (existingTrack) {
        existingTrack.remove()
      } else {
        break
      }
    }

    // Добавляем новый трек
    const trackElement = document.createElement('track')
    trackElement.kind = 'subtitles'
    trackElement.label = track.language
    trackElement.srclang = track.language
    trackElement.default = true
    trackElement.src = getSubtitleVttUrl(track) ?? ''

    video.appendChild(trackElement)

    // Активируем трек
    const handleLoad = () => {
      if (video.textTracks[0]) {
        video.textTracks[0].mode = 'showing'
      }
    }
    trackElement.addEventListener('load', handleLoad)

    return () => {
      trackElement.removeEventListener('load', handleLoad)
      trackElement.remove()
    }
  }, [videoRef, track])

  return null
}

/** Время показа "Следующий эпизод" перед автопереходом (10 сек) */
const AUTO_NEXT_DELAY = 10000

/** Ключ localStorage для хранения предпочтений */
const TRACK_PREFS_KEY = 'animatrona_track_prefs'
const PLAYER_PREFS_KEY = 'animatrona_player_prefs'

/** Предпочтения дорожек для аниме */
interface TrackPreferences {
  [animeId: string]: {
    audioTrackId?: string
    subtitleTrackId?: string | null
  }
}

/** Предпочтения плеера */
interface PlayerPreferences {
  volume: number
  brightness: number
  playbackSpeed: PlaybackSpeed
}

/** Получить предпочтения дорожек из localStorage */
function getTrackPreferences(): TrackPreferences {
  try {
    const stored = localStorage.getItem(TRACK_PREFS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/** Сохранить предпочтения дорожек в localStorage */
function saveTrackPreferences(prefs: TrackPreferences): void {
  try {
    localStorage.setItem(TRACK_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Игнорируем ошибки localStorage
  }
}

/** Получить предпочтения плеера из localStorage */
function getPlayerPreferences(): PlayerPreferences {
  try {
    const stored = localStorage.getItem(PLAYER_PREFS_KEY)
    return stored ? JSON.parse(stored) : { volume: 1, brightness: 1, playbackSpeed: 1 }
  } catch {
    return { volume: 1, brightness: 1, playbackSpeed: 1 }
  }
}

/** Сохранить предпочтения плеера в localStorage */
function savePlayerPreferences(prefs: PlayerPreferences): void {
  try {
    localStorage.setItem(PLAYER_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Игнорируем ошибки localStorage
  }
}

export function PlayerPage() {
  const { episodeId } = useParams<{ episodeId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI состояния
  const [showControls, setShowControls] = useState(true)
  const [isSeeking, setIsSeeking] = useState(false)
  const [showPlayOverlay, setShowPlayOverlay] = useState(true)
  // Fullscreen нужен ВСЕГДА при входе из списка эпизодов
  const [needsFullscreen, setNeedsFullscreen] = useState(true)

  // Skip OP/ED
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)
  const [showSkipButton, setShowSkipButton] = useState(false)

  // Автопереход на следующий эпизод
  const [showNextEpisode, setShowNextEpisode] = useState(false)
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(0)
  const nextEpisodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Меню выбора дорожек
  const [showTrackMenu, setShowTrackMenu] = useState(false)
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<string | null>(null)
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState<string | null>(null)

  // Меню скорости
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)

  // Громкость (без UI регулировки)
  const playerPrefs = useRef(getPlayerPreferences())
  const [volume] = useState(playerPrefs.current.volume)

  // Буферизация
  const [bufferedTime, setBufferedTime] = useState(0)

  // Жесты — для GestureIndicator (double-tap)
  const [gesture, setGesture] = useState<{ type: GestureType; value: number } | null>(null)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Double-tap ripple
  const [doubleTapRipple, setDoubleTapRipple] = useState<{ x: number; y: number; direction: 'left' | 'right' } | null>(
    null
  )

  // Автосохранение прогресса
  const lastSavedTime = useRef(0)

  // Следующий эпизод
  const nextEpisode = useMemo(() => {
    if (!anime || !episode) {
      return null
    }
    const currentIndex = anime.episodes.findIndex((e) => e.id === episode.id)
    if (currentIndex === -1 || currentIndex >= anime.episodes.length - 1) {
      return null
    }
    const next = anime.episodes[currentIndex + 1]
    return next?.videoCid || next?.videoPath ? next : null
  }, [anime, episode])

  // Текущая аудиодорожка
  const currentAudioTrack = useMemo((): AudioTrack | null => {
    if (!episode || !selectedAudioTrack) {
      return null
    }
    return episode.audioTracks.find((t) => t.id === selectedAudioTrack) ?? null
  }, [episode, selectedAudioTrack])

  // Текущая дорожка субтитров
  const currentSubtitleTrack = useMemo((): SubtitleTrack | null => {
    if (!episode || !selectedSubtitleTrack) {
      return null
    }
    return episode.subtitleTracks.find((t) => t.id === selectedSubtitleTrack) ?? null
  }, [episode, selectedSubtitleTrack])

  // Проверка формата субтитров (ASS/SSA требуют SubtitlesOctopus)
  const isAssSubtitle = useMemo(() => {
    if (!currentSubtitleTrack) {
      return false
    }
    const format = currentSubtitleTrack.format.toLowerCase()
    return format === 'ass' || format === 'ssa'
  }, [currentSubtitleTrack])

  // Мемоизированные URL субтитров и шрифтов (чтобы избежать пересоздания SubtitlesOctopus)
  const subtitleUrl = useMemo(
    () => (currentSubtitleTrack?.fileCid ? getIpfsUrl(currentSubtitleTrack.fileCid) : null),
    [currentSubtitleTrack?.fileCid]
  )
  const subtitleFonts = useMemo(
    () => currentSubtitleTrack?.fontCids.map((cid) => getIpfsUrl(cid)) ?? [],
    [currentSubtitleTrack?.fontCids]
  )

  // URL видео и аудио
  const videoUrl = useMemo(() => (episode ? getEpisodeVideoUrl(episode) : null), [episode])
  const audioUrl = useMemo(
    () => (currentAudioTrack?.audioCid ? getAudioCidUrl(currentAudioTrack.audioCid) : null),
    [currentAudioTrack]
  )

  // Mobile Player хук
  const {
    containerRef,
    videoRef,
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading: playerLoading,
    isReady,
    togglePlay,
    seek,
    skip,
  } = useMobilePlayer({
    videoUrl,
    audioUrl,
    startTime: episode?.progress?.currentTime ?? 0,
    onTimeUpdate: (time) => {
      // Обновление главы
      if (episode?.chapters?.length) {
        const timeMs = time * 1000
        const chapter = episode.chapters.find((ch) => timeMs >= ch.startMs && timeMs < ch.endMs)
        setCurrentChapter(chapter || null)
        setShowSkipButton(!!chapter?.skippable)
      }

      // Обновление буферизации
      const video = videoRef.current
      if (video && video.buffered.length > 0) {
        const buffered = video.buffered.end(video.buffered.length - 1)
        setBufferedTime(buffered)
      }
    },
    onEnded: () => handleVideoEnded(),
    onError: (err) => setError(err.message),
  })

  // Fullscreen хук
  const { isFullscreen, isSupported: isFullscreenSupported, enterFullscreen, toggleFullscreen } = useFullscreen()

  // Wake Lock хук — активен при воспроизведении
  const { requestWakeLock, releaseWakeLock } = useWakeLock({ enabled: isPlaying })

  // PiP хук
  const { isPiPActive, isSupported: isPiPSupported, togglePiP } = usePiP({ videoRef })

  // Swipe-жесты (только горизонтальный seek)
  const { gestureState, handlers: gestureHandlers } = useGestures({
    currentTime,
    duration,
    onSeek: (time) => {
      seek(time)
    },
    onSeekStart: () => {
      setIsSeeking(true)
    },
    onSeekEnd: () => {
      setIsSeeking(false)
      saveCurrentProgress()
    },
  })

  // Wake Lock — активировать при воспроизведении
  useEffect(() => {
    if (isPlaying) {
      requestWakeLock()
    } else {
      releaseWakeLock()
    }
  }, [isPlaying, requestWakeLock, releaseWakeLock])

  // Обработчик Play из overlay — всё в одном user gesture
  const handlePlayFromOverlay = useCallback(() => {
    setShowPlayOverlay(false)
    togglePlay() // video.play()

    // Fullscreen — только если ещё не в fullscreen
    if (isFullscreen) {
      setNeedsFullscreen(false)
    } else if (isFullscreenSupported) {
      setNeedsFullscreen(false)
      enterFullscreen()
    }
    // Иначе оставляем needsFullscreen=true — может сработает по тапу
  }, [togglePlay, enterFullscreen, isFullscreenSupported, isFullscreen])

  // Сбросить needsFullscreen если уже в fullscreen (fullscreen вызван при клике на эпизод)
  useEffect(() => {
    if (isFullscreen && needsFullscreen) {
      setNeedsFullscreen(false)
    }
  }, [isFullscreen, needsFullscreen])

  // Автоплей для эпизодов с прогрессом (уже смотрели)
  useEffect(() => {
    if (!isReady || !episode) {
      return
    }

    const hasProgress = (episode.progress?.currentTime ?? 0) > 10 // Если смотрели больше 10 сек
    if (hasProgress && showPlayOverlay) {
      // Скрываем overlay и пробуем автоплей
      setShowPlayOverlay(false)
      // Попытка автоплея (может не сработать на мобильных без gesture)
      togglePlay()
      // needsFullscreen сбросится автоматически если fullscreen уже активен
    }
  }, [isReady, episode, showPlayOverlay, togglePlay, isFullscreen])

  // Применение громкости при готовности видео
  useEffect(() => {
    if (isReady) {
      if (videoRef.current) {
        videoRef.current.volume = volume
      }
      if (audioRef.current) {
        audioRef.current.volume = volume
      }
    }
  }, [isReady, volume, videoRef, audioRef])

  // Применение скорости воспроизведения
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed, videoRef, audioRef])

  // Загрузка данных
  useEffect(() => {
    if (!episodeId) {
      return
    }

    const animeId = searchParams.get('anime')
    if (!animeId) {
      setError('Не указан ID аниме')
      setLoading(false)
      return
    }

    // Восстановить предпочтения плеера (только скорость)
    const savedPrefs = getPlayerPreferences()
    setPlaybackSpeed(savedPrefs.playbackSpeed)
    playerPrefs.current = savedPrefs

    getAnimeDetails(animeId)
      .then((data) => {
        setAnime(data)
        const ep = data.episodes.find((e) => e.id === episodeId)
        if (!ep) {
          setError('Эпизод не найден')
        } else if (!ep.videoCid && !ep.videoPath) {
          setError('Видеофайл не найден')
        } else {
          setEpisode(ep)

          // Восстановить предпочтения дорожек
          const prefs = getTrackPreferences()
          const animePref = prefs[animeId]
          let audioTrackSet = false

          if (animePref) {
            if (animePref.audioTrackId) {
              const hasTrack = ep.audioTracks.some((t) => t.id === animePref.audioTrackId)
              if (hasTrack) {
                setSelectedAudioTrack(animePref.audioTrackId)
                audioTrackSet = true
              }
            }
            if (animePref.subtitleTrackId !== undefined) {
              const hasTrack =
                animePref.subtitleTrackId === null || ep.subtitleTracks.some((t) => t.id === animePref.subtitleTrackId)
              if (hasTrack) {
                setSelectedSubtitleTrack(animePref.subtitleTrackId)
              }
            }
          }

          // ВСЕГДА устанавливать дефолтную аудиодорожку если не выбрана
          if (!audioTrackSet && ep.audioTracks.length > 0) {
            const defaultTrack = ep.audioTracks.find((t) => t.isDefault) || ep.audioTracks[0]
            setSelectedAudioTrack(defaultTrack.id)
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [episodeId, searchParams])

  // Автоскрытие контролов — увеличен таймаут до 5 секунд
  useEffect(() => {
    if (!showControls || showTrackMenu || showNextEpisode || showSpeedMenu) {
      return
    }

    const timer = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [showControls, isPlaying, showTrackMenu, showNextEpisode, showSpeedMenu])

  // Сохранение прогресса
  const saveCurrentProgress = useCallback(async () => {
    if (!episodeId || !videoRef.current) {
      return
    }

    const time = videoRef.current.currentTime
    if (Math.abs(time - lastSavedTime.current) < 2) {
      return
    }

    lastSavedTime.current = time

    try {
      await saveProgress(episodeId, { currentTime: time })
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }, [episodeId, videoRef])

  // Периодическое сохранение
  useEffect(() => {
    if (!isPlaying) {
      return
    }

    const interval = setInterval(saveCurrentProgress, SAVE_INTERVAL)
    return () => clearInterval(interval)
  }, [isPlaying, saveCurrentProgress])

  // Синхронизация аудио при смене дорожки
  useEffect(() => {
    const audio = audioRef.current
    const video = videoRef.current
    if (!audio || !audioUrl) {
      return
    }

    // Устанавливаем новый источник
    audio.src = audioUrl
    audio.load()

    // Синхронизируем время с видео
    if (video) {
      audio.currentTime = video.currentTime
      // Если видео играет — запускаем аудио
      if (!video.paused) {
        audio.play().catch((err) => console.warn('[Player] Audio play failed:', err))
      }
    }
  }, [audioUrl, audioRef, videoRef])

  // Сохранение предпочтений дорожек
  const saveTrackPref = useCallback(
    (audioId: string | null, subtitleId: string | null) => {
      const animeId = searchParams.get('anime')
      if (!animeId) {
        return
      }

      const prefs = getTrackPreferences()
      prefs[animeId] = {
        audioTrackId: audioId || undefined,
        subtitleTrackId: subtitleId,
      }
      saveTrackPreferences(prefs)
    },
    [searchParams]
  )

  // Обработка окончания видео
  const handleVideoEnded = async () => {
    if (episodeId) {
      await saveProgress(episodeId, { currentTime: duration, completed: true })
    }

    // Показать overlay следующего эпизода
    if (nextEpisode) {
      setShowNextEpisode(true)
      setNextEpisodeCountdown(AUTO_NEXT_DELAY / 1000)

      const countdownInterval = setInterval(() => {
        setNextEpisodeCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      nextEpisodeTimeoutRef.current = setTimeout(() => {
        clearInterval(countdownInterval)
        goToNextEpisode()
      }, AUTO_NEXT_DELAY)
    }
  }

  // Обработка seek через слайдер
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    seek(time)
  }

  const handleSeekStart = () => setIsSeeking(true)
  const handleSeekEnd = () => {
    setIsSeeking(false)
    saveCurrentProgress()
  }

  // Пропуск главы (OP/ED)
  const skipChapter = () => {
    if (!currentChapter) {
      return
    }
    seek(currentChapter.endMs / 1000)
    setShowSkipButton(false)
  }

  // Переход к следующему эпизоду
  const goToNextEpisode = () => {
    if (!nextEpisode || !anime) {
      return
    }

    if (nextEpisodeTimeoutRef.current) {
      clearTimeout(nextEpisodeTimeoutRef.current)
    }

    setShowNextEpisode(false)
    navigate(`/player/${nextEpisode.id}?anime=${anime.id}`, { replace: true })
  }

  // Отмена автоперехода
  const cancelAutoNext = () => {
    if (nextEpisodeTimeoutRef.current) {
      clearTimeout(nextEpisodeTimeoutRef.current)
    }
    setShowNextEpisode(false)
  }

  const handleBack = async () => {
    await saveCurrentProgress()
    if (nextEpisodeTimeoutRef.current) {
      clearTimeout(nextEpisodeTimeoutRef.current)
    }
    navigate(-1)
  }

  // Показать индикатор жеста (для double-tap)
  const showGesture = useCallback((type: GestureType, value: number) => {
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current)
    }
    setGesture({ type, value })
    gestureTimeoutRef.current = setTimeout(() => {
      setGesture(null)
    }, 600)
  }, [])

  // Обработка тапа/double-tap — используем onPointerUp для лучшей совместимости с мобильными
  const handleVideoAreaTap = useCallback(
    (e: React.PointerEvent) => {
      // Игнорируем если меню открыты или PlayOverlay виден
      if (showTrackMenu || showNextEpisode || showSpeedMenu || showPlayOverlay) {
        return
      }

      // Игнорируем если это часть swipe жеста
      if (gestureState.type) {
        return
      }

      // Включаем fullscreen по первому тапу если нужно (user gesture)
      if (needsFullscreen && !isFullscreen) {
        setNeedsFullscreen(false)
        enterFullscreen()
      }

      const now = Date.now()
      const { clientX, clientY } = e
      const screenWidth = window.innerWidth

      if (lastTapRef.current && now - lastTapRef.current.time < 300) {
        // Double-tap — пропуск
        e.preventDefault()
        e.stopPropagation()

        const isRight = clientX > screenWidth / 2
        const skipAmount = isRight ? 10 : -10
        skip(skipAmount)
        showGesture(isRight ? 'skip-forward' : 'skip-backward', Math.abs(skipAmount))

        // Ripple эффект
        setDoubleTapRipple({
          x: clientX,
          y: clientY,
          direction: isRight ? 'right' : 'left',
        })
        setTimeout(() => setDoubleTapRipple(null), 600)

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(15)
        }

        lastTapRef.current = null
      } else {
        // Single tap — сохраняем и ждём возможный double-tap
        lastTapRef.current = { time: now, x: clientX, y: clientY }

        setTimeout(() => {
          if (lastTapRef.current && Date.now() - lastTapRef.current.time >= 290) {
            // Прошло достаточно времени — это single tap, toggle UI
            setShowControls((prev) => !prev)
            lastTapRef.current = null
          }
        }, 310)
      }
    },
    [
      showTrackMenu,
      showNextEpisode,
      showSpeedMenu,
      showPlayOverlay,
      gestureState.type,
      skip,
      showGesture,
      needsFullscreen,
      isFullscreen,
      enterFullscreen,
    ]
  )

  // Выбор аудио дорожки
  const handleAudioTrackSelect = (trackId: string) => {
    setSelectedAudioTrack(trackId)
    saveTrackPref(trackId, selectedSubtitleTrack)
    setShowTrackMenu(false)
  }

  // Выбор субтитров
  const handleSubtitleTrackSelect = (trackId: string | null) => {
    setSelectedSubtitleTrack(trackId)
    saveTrackPref(selectedAudioTrack, trackId)
    setShowTrackMenu(false)
  }

  // Выбор скорости
  const handleSpeedChange = (speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed)
    playerPrefs.current.playbackSpeed = speed
    savePlayerPreferences(playerPrefs.current)
  }

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Название языка
  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      ru: 'Русский',
      rus: 'Русский',
      en: 'English',
      eng: 'English',
      ja: '日本語',
      jpn: '日本語',
      und: 'Неизвестный',
    }
    return names[code.toLowerCase()] || code
  }

  // Название типа главы
  const getChapterTypeName = (type: string) => {
    const names: Record<string, string> = {
      OP: 'опенинг',
      ED: 'эндинг',
      RECAP: 'рекап',
      PREVIEW: 'превью',
    }
    return names[type] || ''
  }

  // CSS fallback: 100dvh с fallback на 100vh для старых браузеров
  const fullHeight = '100dvh'

  if (loading) {
    return (
      <Flex h={fullHeight} minH="100vh" bg="black" align="center" justify="center">
        <Spinner size="xl" color="purple.500" />
      </Flex>
    )
  }

  if (error || !episode) {
    return (
      <Flex h={fullHeight} minH="100vh" bg="black" align="center" justify="center" direction="column" gap={4}>
        <ErrorState
          title={error || 'Эпизод не найден'}
          message="Не удалось загрузить видео"
          onRetry={() => window.location.reload()}
        />
        <Box
          as="button"
          display="flex"
          alignItems="center"
          gap={2}
          color="gray.400"
          minH="44px"
          px={4}
          onClick={() => navigate(-1)}
        >
          <LuArrowLeft size={18} />
          Назад
        </Box>
      </Flex>
    )
  }

  // Контролы скрыты когда: PlayOverlay виден, меню открыто, или следующий эпизод
  const controlsVisible = showControls && !showTrackMenu && !showNextEpisode && !showSpeedMenu && !showPlayOverlay

  return (
    <Box
      h={fullHeight}
      minH="100vh"
      bg="black"
      position="relative"
      overflow="hidden"
      onPointerUp={handleVideoAreaTap}
      {...gestureHandlers}
    >
      {/* Скрытое аудио для раздельных дорожек */}
      {audioUrl && <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />}

      {/* Контейнер видео */}
      <Box ref={containerRef} w="100%" h="100%" />

      {/* Play Overlay — показывается при первом входе для user gesture */}
      <PlayOverlay
        visible={showPlayOverlay}
        animeName={anime?.name}
        episodeName={`Эпизод ${episode.number}${episode.name ? `: ${episode.name}` : ''}`}
        isLoading={!isReady}
        onPlay={handlePlayFromOverlay}
      />

      {/* Полупрозрачная подложка когда контролы видны */}
      <Box
        position="absolute"
        inset={0}
        bg="black/40"
        opacity={controlsVisible ? 1 : 0}
        transition="opacity 0.3s ease-out"
        pointerEvents="none"
        zIndex={5}
      />

      {/* ASS/SSA субтитры через SubtitlesOctopus — только после готовности видео */}
      {isAssSubtitle && subtitleUrl && isReady && (
        <SubtitleOverlay videoRef={videoRef} subtitleUrl={subtitleUrl} fonts={subtitleFonts} />
      )}

      {/* VTT/SRT субтитры через нативный track */}
      {!isAssSubtitle && currentSubtitleTrack?.fileCid && videoRef.current && (
        <NativeSubtitleTrack videoRef={videoRef} track={currentSubtitleTrack} />
      )}

      {/* Загрузка — скрыт когда PlayOverlay виден (он сам показывает spinner) */}
      {playerLoading && !showPlayOverlay && (
        <Flex position="absolute" inset={0} align="center" justify="center" bg="blackAlpha.600" zIndex={20}>
          <Spinner size="xl" color="purple.500" />
        </Flex>
      )}

      {/* Seek Preview (для swipe seek) */}
      {gestureState.type === 'seek' && gestureState.seekPreviewTime !== null && (
        <Box position="absolute" bottom="100px" left={0} right={0} display="flex" justifyContent="center" zIndex={100}>
          <SeekPreview
            time={gestureState.seekPreviewTime}
            currentTime={currentTime}
            visible={gestureState.showIndicator}
          />
        </Box>
      )}

      {/* Double-tap ripple effect */}
      <DoubleTapRipple trigger={doubleTapRipple} />

      {/* Индикатор жеста (для double-tap) */}
      {gesture && (
        <GestureIndicator
          type={gesture.type}
          value={gesture.value}
          position={gesture.type === 'skip-backward' ? 'left' : gesture.type === 'skip-forward' ? 'right' : 'center'}
        />
      )}

      {/* Кнопка пропуска OP/ED */}
      {showSkipButton && currentChapter && (
        <Box
          as="button"
          position="absolute"
          bottom={24}
          right={4}
          zIndex={50}
          display="flex"
          alignItems="center"
          gap={2}
          bg="purple.600"
          color="white"
          px={4}
          py={3}
          minH="44px"
          borderRadius="lg"
          fontSize="sm"
          fontWeight="medium"
          cursor="pointer"
          onClick={(e) => {
            e.stopPropagation()
            skipChapter()
          }}
          transition="all 0.2s"
          _hover={{ bg: 'purple.500' }}
          _active={{ transform: 'scale(0.98)' }}
        >
          <LuRotateCw size={18} />
          Пропустить {getChapterTypeName(currentChapter.type)}
        </Box>
      )}

      {/* Overlay следующего эпизода */}
      {showNextEpisode && nextEpisode && (
        <Box
          position="absolute"
          inset={0}
          bg="blackAlpha.800"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={100}
          onClick={(e) => e.stopPropagation()}
        >
          <VStack gap={6} textAlign="center">
            <Text color="gray.400" fontSize="sm">
              Следующий эпизод через {nextEpisodeCountdown} сек
            </Text>
            <Text color="white" fontSize="xl" fontWeight="bold">
              Эпизод {nextEpisode.number}
              {nextEpisode.name && `: ${nextEpisode.name}`}
            </Text>
            <Flex gap={4}>
              <Box
                as="button"
                display="flex"
                alignItems="center"
                gap={2}
                px={6}
                py={3}
                minH="48px"
                bg="purple.600"
                color="white"
                borderRadius="lg"
                fontWeight="medium"
                onClick={goToNextEpisode}
                _active={{ transform: 'scale(0.98)' }}
              >
                <LuPlay size={20} />
                Смотреть сейчас
              </Box>
              <Box
                as="button"
                display="flex"
                alignItems="center"
                gap={2}
                px={6}
                py={3}
                minH="48px"
                bg="gray.700"
                color="white"
                borderRadius="lg"
                fontWeight="medium"
                onClick={cancelAutoNext}
                _active={{ transform: 'scale(0.98)' }}
              >
                <LuX size={20} />
                Отмена
              </Box>
            </Flex>
          </VStack>
        </Box>
      )}

      {/* Меню выбора дорожек */}
      {showTrackMenu && (
        <Box
          position="absolute"
          inset={0}
          bg="blackAlpha.800"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={100}
          onClick={(e) => {
            e.stopPropagation()
            setShowTrackMenu(false)
          }}
        >
          <Box
            bg="gray.900"
            borderRadius="xl"
            p={6}
            maxW="400px"
            w="90%"
            maxH="80vh"
            overflowY="auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Аудио дорожки */}
            {episode.audioTracks.length > 0 && (
              <Box mb={6}>
                <Text color="gray.400" fontSize="sm" mb={3}>
                  Аудио
                </Text>
                <VStack gap={2} align="stretch">
                  {episode.audioTracks.map((track) => (
                    <Box
                      key={track.id}
                      p={3}
                      bg={selectedAudioTrack === track.id ? 'purple.900' : 'gray.800'}
                      borderRadius="lg"
                      cursor="pointer"
                      onClick={() => handleAudioTrackSelect(track.id)}
                      transition="all 0.2s"
                      _hover={{ bg: selectedAudioTrack === track.id ? 'purple.800' : 'gray.700' }}
                    >
                      <Flex justify="space-between" align="center">
                        <VStack align="start" gap={0}>
                          <Text fontWeight="medium">
                            {getLanguageName(track.language)}
                            {track.dubGroup && ` (${track.dubGroup})`}
                            {track.title && !track.dubGroup && ` — ${track.title}`}
                          </Text>
                          <Text color="gray.500" fontSize="xs">
                            {track.codec}
                            {track.channels && ` • ${track.channels}`}
                            {track.isDefault && ' • По умолчанию'}
                          </Text>
                        </VStack>
                        {selectedAudioTrack === track.id && (
                          <LuCheck size={20} color="var(--chakra-colors-purple-400)" />
                        )}
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {/* Субтитры */}
            {episode.subtitleTracks.length > 0 && (
              <Box>
                <Text color="gray.400" fontSize="sm" mb={3}>
                  Субтитры
                </Text>
                <VStack gap={2} align="stretch">
                  <Box
                    p={3}
                    bg={selectedSubtitleTrack === null ? 'purple.900' : 'gray.800'}
                    borderRadius="lg"
                    cursor="pointer"
                    onClick={() => handleSubtitleTrackSelect(null)}
                    transition="all 0.2s"
                    _hover={{ bg: selectedSubtitleTrack === null ? 'purple.800' : 'gray.700' }}
                  >
                    <Flex justify="space-between" align="center">
                      <Text fontWeight="medium">Выключены</Text>
                      {selectedSubtitleTrack === null && <LuCheck size={20} color="var(--chakra-colors-purple-400)" />}
                    </Flex>
                  </Box>

                  {episode.subtitleTracks.map((track) => (
                    <Box
                      key={track.id}
                      p={3}
                      bg={selectedSubtitleTrack === track.id ? 'purple.900' : 'gray.800'}
                      borderRadius="lg"
                      cursor="pointer"
                      onClick={() => handleSubtitleTrackSelect(track.id)}
                      transition="all 0.2s"
                      _hover={{ bg: selectedSubtitleTrack === track.id ? 'purple.800' : 'gray.700' }}
                    >
                      <Flex justify="space-between" align="center">
                        <VStack align="start" gap={0}>
                          <Text fontWeight="medium">
                            {getLanguageName(track.language)}
                            {track.dubGroup && ` (${track.dubGroup})`}
                            {track.title && !track.dubGroup && ` — ${track.title}`}
                          </Text>
                          <Text color="gray.500" fontSize="xs">
                            {track.format.toUpperCase()}
                            {track.isDefault && ' • По умолчанию'}
                          </Text>
                        </VStack>
                        {selectedSubtitleTrack === track.id && (
                          <LuCheck size={20} color="var(--chakra-colors-purple-400)" />
                        )}
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            <Box
              as="button"
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={2}
              mt={6}
              w="100%"
              p={3}
              minH="48px"
              bg="gray.700"
              color="white"
              borderRadius="lg"
              fontWeight="medium"
              onClick={() => setShowTrackMenu(false)}
              _active={{ transform: 'scale(0.98)' }}
            >
              Закрыть
            </Box>
          </Box>
        </Box>
      )}

      {/* Меню скорости */}
      <SpeedSelector
        currentSpeed={playbackSpeed}
        onSpeedChange={handleSpeedChange}
        visible={showSpeedMenu}
        onClose={() => setShowSpeedMenu(false)}
      />

      {/* Контролы с slide-in анимацией */}
      {/* Верхняя панель */}
      <ControlsPanel position="top" visible={controlsVisible}>
        <Flex align="center" gap={4}>
          <IconButton aria-label="Назад" variant="ghost" color="white" minW="44px" minH="44px" onClick={handleBack}>
            <LuArrowLeft size={24} />
          </IconButton>
          <VStack align="start" gap={0} flex={1}>
            <Text fontWeight="semibold" lineClamp={1}>
              {anime?.name}
            </Text>
            <Text color="gray.400" fontSize="sm">
              Эпизод {episode.number}
              {episode.name && `: ${episode.name}`}
            </Text>
          </VStack>

          <Flex gap={1}>
            {/* Скорость */}
            <IconButton
              aria-label="Скорость"
              variant="ghost"
              color="white"
              minW="44px"
              minH="44px"
              onClick={(e) => {
                e.stopPropagation()
                setShowSpeedMenu(true)
              }}
            >
              <Box position="relative">
                <LuGauge size={22} />
                {playbackSpeed !== 1 && (
                  <Text
                    position="absolute"
                    bottom="-6px"
                    right="-6px"
                    fontSize="10px"
                    fontWeight="bold"
                    color="purple.400"
                  >
                    {playbackSpeed}x
                  </Text>
                )}
              </Box>
            </IconButton>

            {/* PiP */}
            {isPiPSupported && <PiPButton isActive={isPiPActive} onClick={togglePiP} />}

            {/* Fullscreen */}
            {isFullscreenSupported && (
              <IconButton
                aria-label={isFullscreen ? 'Выйти из полноэкранного' : 'Полноэкранный режим'}
                variant="ghost"
                color="white"
                minW="44px"
                minH="44px"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFullscreen()
                }}
              >
                {isFullscreen ? <LuMinimize size={22} /> : <LuMaximize size={22} />}
              </IconButton>
            )}

            {/* Дорожки */}
            {(episode.audioTracks.length > 1 || episode.subtitleTracks.length > 0) && (
              <IconButton
                aria-label="Дорожки"
                variant="ghost"
                color="white"
                minW="44px"
                minH="44px"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTrackMenu(true)
                }}
              >
                <LuSettings size={24} />
              </IconButton>
            )}
          </Flex>
        </Flex>
      </ControlsPanel>

      {/* Центральные кнопки */}
      <Flex
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        gap={8}
        align="center"
        opacity={controlsVisible ? 1 : 0}
        transition="opacity 0.3s"
        pointerEvents={controlsVisible ? 'auto' : 'none'}
        zIndex={9999}
      >
        <IconButton
          aria-label="-10 сек"
          variant="ghost"
          color="white"
          minW="48px"
          minH="48px"
          onClick={(e) => {
            e.stopPropagation()
            skip(-10)
            showGesture('skip-backward', 10)
          }}
        >
          <LuRotateCcw size={28} />
        </IconButton>

        <IconButton
          aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
          variant="solid"
          bg="white"
          color="black"
          borderRadius="full"
          minW="64px"
          minH="64px"
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
        >
          {isPlaying ? <LuPause size={32} /> : <LuPlay size={32} />}
        </IconButton>

        <IconButton
          aria-label="+10 сек"
          variant="ghost"
          color="white"
          minW="48px"
          minH="48px"
          onClick={(e) => {
            e.stopPropagation()
            skip(10)
            showGesture('skip-forward', 10)
          }}
        >
          <LuRotateCw size={28} />
        </IconButton>
      </Flex>

      {/* Нижняя панель */}
      <ControlsPanel position="bottom" visible={controlsVisible}>
        {/* Прогресс-бар */}
        <Box position="relative" mb={2}>
          {/* Маркеры глав */}
          {episode.chapters?.map((chapter) => {
            const startPercent = duration > 0 ? (chapter.startMs / 1000 / duration) * 100 : 0
            const widthPercent = duration > 0 ? ((chapter.endMs - chapter.startMs) / 1000 / duration) * 100 : 0
            const isOP = chapter.type === 'OP'
            const isED = chapter.type === 'ED'

            if (!isOP && !isED) {
              return null
            }

            return (
              <Box
                key={chapter.id}
                position="absolute"
                top={0}
                left={`${startPercent}%`}
                w={`${widthPercent}%`}
                h="8px"
                bg={isOP ? 'blue.500' : 'orange.500'}
                opacity={0.5}
                borderRadius="4px"
                pointerEvents="none"
                zIndex={1}
              />
            )
          })}

          {/* Слайдер */}
          <Box
            h="44px"
            display="flex"
            alignItems="center"
            position="relative"
            zIndex={2}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              onMouseDown={handleSeekStart}
              onMouseUp={handleSeekEnd}
              onTouchStart={(e) => {
                e.stopPropagation()
                handleSeekStart()
              }}
              onTouchEnd={(e) => {
                e.stopPropagation()
                handleSeekEnd()
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                height: '44px',
                padding: '18px 0',
                appearance: 'none',
                background: 'transparent',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                touchAction: 'none',
              }}
            />
            {/* Видимый трек под input */}
            <Box
              position="absolute"
              left={0}
              right={0}
              top="50%"
              transform="translateY(-50%)"
              h="8px"
              borderRadius="4px"
              pointerEvents="none"
              bg="gray.700"
              overflow="hidden"
            >
              {/* Буфер */}
              <BufferProgress bufferedTime={bufferedTime} duration={duration} />
              {/* Прогресс */}
              <Box
                position="absolute"
                left={0}
                top={0}
                h="100%"
                bg="purple.500"
                w={`${(currentTime / (duration || 1)) * 100}%`}
                transition={isSeeking ? 'none' : 'width 0.1s'}
                borderRadius="4px"
              />
            </Box>
          </Box>
        </Box>

        {/* Время */}
        <Flex justify="space-between" color="gray.300" fontSize="sm">
          <Text>{formatTime(currentTime)}</Text>
          <Text>{formatTime(duration)}</Text>
        </Flex>
      </ControlsPanel>
    </Box>
  )
}
