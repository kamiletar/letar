/**
 * Экран плеера с синхронным воспроизведением видео + внешнего аудио
 *
 * Возможности:
 * - Синхронизация видео + аудио через MergingMediaSource
 * - ASS/SRT субтитры
 * - Жесты VLC-style (свайп громкость/яркость/перемотка, double-tap ±10 сек)
 * - Long press = 2x скорость (как YouTube)
 * - Автоскрытие контролов
 * - Блокировка экрана
 * - Сохранение/восстановление прогресса
 * - Пропуск OP/ED
 * - Переключение эпизодов
 * - Выбор скорости воспроизведения
 */

import {
  ArrowLeft,
  Captions,
  CaptionsOff,
  EllipsisVertical,
  Gauge,
  Languages,
  ListMusic,
  Lock,
  LockOpen,
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import {
  getAnimeDetails,
  getDownloadedFontDir,
  getDownloadedSubtitlePaths,
  getEpisodeAudioUrl,
  getEpisodeVideoUrl,
  getSubtitleUrlFromCid,
  saveProgress as saveProgressToServer,
} from '@/api'
import { isAssFormat, NativeAssView, useAssContent } from '@/components/NativeAssView'
import { FadeView } from '@/components/player/FadeView'
import { GestureOverlay } from '@/components/player/GestureOverlay'
import { GradientOverlay } from '@/components/player/GradientOverlay'
import { LockOverlay } from '@/components/player/LockOverlay'
import { NextEpisodeOverlay } from '@/components/player/NextEpisodeOverlay'
import { PlayerSettingsModal } from '@/components/player/PlayerSettingsModal'
import { ResumeOverlay } from '@/components/player/ResumeOverlay'
import { SeekBar } from '@/components/player/SeekBar'
import { SkipChapterButton } from '@/components/player/SkipChapterButton'
import { SpeedSelector } from '@/components/player/SpeedSelector'
import { isSrtFormat, SrtSubtitleView, useSrtContent } from '@/components/SrtSubtitleView'
import { useBrightness } from '@/hooks/useBrightness'
import { useControlsVisibility } from '@/hooks/useControlsVisibility'
import { useLockScreen } from '@/hooks/useLockScreen'
import { type PipAction, usePictureInPicture } from '@/hooks/usePictureInPicture'
import { useRemoteControl } from '@/hooks/useRemoteControl'
import { useSystemVolume } from '@/hooks/useSystemVolume'
import { useWakeLock } from '@/hooks/useWakeLock'
import type { PlayerScreenProps } from '@/navigation/types'
import { Haptics } from '@/services/haptics'
import { queueProgressSync } from '@/services/progressSync'
import { useOfflineStore } from '@/store/offline'
import { usePlayerSettingsStore } from '@/store/playerSettings'
import type { AnimeDetails, AudioTrack as ApiAudioTrack, Episode, SubtitleTrack } from '@letar/animatrona-shared'
import { useWatchProgress } from '@letar/animatrona-shared'

import {
  type OnLoadData,
  type OnProgressData,
  SyncVideoPlayer,
  type SyncVideoPlayerRef,
} from '@/components/SyncVideoPlayer'

/** Время до конца для показа NextEpisodeOverlay (секунды) */
const NEXT_EPISODE_THRESHOLD = 30

/** Время до конца для начала предзагрузки следующего эпизода (секунды) */
const PREFETCH_THRESHOLD = 180

/** Маппинг языковых кодов */
const LANG_NAMES: Record<string, string> = {
  rus: 'Русский',
  jpn: 'Японский',
  eng: 'Английский',
  chi: 'Китайский',
  kor: 'Корейский',
  fre: 'Французский',
  ger: 'Немецкий',
  spa: 'Испанский',
  und: 'Неизвестный',
}

/** Является ли аудиодорожка оригинальной (японской) */
function isOriginalAudio(track: ApiAudioTrack): boolean {
  return track.language === 'jpn' || track.language === 'ja'
}

/** Является ли язык русским (поддержка ISO 639-1 и 639-2) */
function isRussianLanguage(lang: string): boolean {
  return lang === 'rus' || lang === 'ru'
}

/** Являются ли субтитры только "надписями" (signs-only) */
function isSignsSubtitles(track: SubtitleTrack): boolean {
  const name = (track.name ?? track.title ?? '').toLowerCase()
  return ['надписи', 'signs', 'ops', 'op/ed', 'signs&songs', 'signs & songs'].some((k) => name.includes(k))
}

export function PlayerScreen({ navigation, route }: PlayerScreenProps) {
  const { episodeId, animeId, startTime: initialStartTime } = route.params

  const playerRef = useRef<SyncVideoPlayerRef>(null)

  // Если передан startTime — пользователь уже выбрал "продолжить" из AnimeScreen
  // В этом случае не показываем ResumeOverlay и сразу переходим к нужной позиции
  const hasExternalStartTime = initialStartTime !== undefined && initialStartTime > 0

  // Состояние данных
  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Состояние плеера
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume] = useState(1.0)
  const [volumeBoost, setVolumeBoost] = useState(0) // 0-100, где 100 = +100% (200% громкости)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover'>('contain')
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9)
  const [videoWidth, setVideoWidth] = useState(1920)
  const [videoHeight, setVideoHeight] = useState(1080)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const seekLockUntilRef = useRef(0) // Timestamp до которого игнорируем progress

  // Pinch-to-zoom состояние
  const [zoomScale, setZoomScale] = useState(1.0)
  const [zoomTranslateX, setZoomTranslateX] = useState(0)
  const [zoomTranslateY, setZoomTranslateY] = useState(0)

  // Оффлайн (зарезервировано для будущего использования)
  useOfflineStore((s) => !s.isServerReachable)

  // Не давать экрану гаснуть во время воспроизведения
  useWakeLock({ enabled: isPlaying })

  // Аудио и субтитры
  const [downloadedSubPaths, setDownloadedSubPaths] = useState<Record<string, string>>({})
  const [downloadedFontDirPath, setDownloadedFontDirPath] = useState<string | null>(null)
  const [selectedExternalAudio, setSelectedExternalAudio] = useState<ApiAudioTrack | null>(null)
  const [selectedSubtitle, setSelectedSubtitle] = useState<SubtitleTrack | null>(null)
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true)
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  // Настройки плеера
  const subtitleFontScale = usePlayerSettingsStore((s) => s.subtitleFontScale)
  const preferredAudioIndex = usePlayerSettingsStore((s) => s.audioTrackIndex[animeId])
  const preferredSubtitleIndex = usePlayerSettingsStore((s) => s.subtitleTrackIndex[animeId])
  const setAudioTrackIndex = usePlayerSettingsStore((s) => s.setAudioTrackIndex)
  const setSubtitleTrackIndex = usePlayerSettingsStore((s) => s.setSubtitleTrackIndex)
  const viewingMode = usePlayerSettingsStore((s) => s.viewingMode)
  const setViewingMode = usePlayerSettingsStore((s) => s.setViewingMode)

  // Навигация эпизодов
  const [showNextEpisodeOverlay, setShowNextEpisodeOverlay] = useState(false)
  const [nextEpisodeCancelled, setNextEpisodeCancelled] = useState(false)

  // Решение пользователя о продолжении просмотра
  // true — пользователь выбрал "продолжить" или "сначала" (или не было диалога)
  const [userMadeResumeDecision, setUserMadeResumeDecision] = useState(hasExternalStartTime)

  // Refs
  const pendingSeekRef = useRef<number | null>(null)
  const episodeCompletedRef = useRef(false) // чтобы не отправлять несколько раз
  const prefetchedEpisodeIdRef = useRef<string | null>(null)

  // Хуки
  const lockState = useLockScreen()
  const { brightness, setBrightness } = useBrightness()
  const { volume: systemVolume, setVolume: setSystemVolume } = useSystemVolume()
  const controlsVisibility = useControlsVisibility({
    isPaused: !isPlaying,
    isLocked: lockState.isLocked,
  })

  // PiP: обработка нажатий кнопок в PiP окне
  const handlePipAction = useCallback((action: PipAction) => {
    if (action === 'play') {
      setIsPlaying(true)
    } else if (action === 'pause') {
      setIsPlaying(false)
    }
  }, [])

  const pip = usePictureInPicture({
    autoEnterOnBackground: isPlaying,
    aspectRatio: [16, 9],
    onPipAction: handlePipAction,
  })

  // Синхронизация состояния воспроизведения с PiP кнопками
  useEffect(() => {
    pip.updatePlaybackState(isPlaying)
  }, [isPlaying, pip.updatePlaybackState])

  // При входе в PiP — закрываем все модальные окна (иначе они перекрывают PiP)
  useEffect(() => {
    if (pip.isInPipMode) {
      setShowSpeedMenu(false)
      setShowSettingsMenu(false)
      setShowAudioMenu(false)
      setShowSubtitleMenu(false)
    }
  }, [pip.isInPipMode])

  const watchProgress = useWatchProgress({
    episodeId,
    currentTime,
    duration,
    isReady: videoLoaded,
    // Если передан startTime извне — не показывать диалог "продолжить"
    skipResumePrompt: hasExternalStartTime,
    onSave: (id, data) => {
      saveProgressToServer(id, { ...data, duration }).catch(() => {
        // Сервер недоступен — добавляем в очередь синхронизации
        queueProgressSync(id, { ...data, duration }).catch(() => undefined)
      })
    },
  })

  // Следующий/предыдущий эпизод
  const { prevEpisode, nextEpisode } = useMemo(() => {
    if (!anime || !episode) {
      return { prevEpisode: null, nextEpisode: null }
    }

    const currentIndex = anime.episodes.findIndex((e) => e.id === episode.id)
    return {
      prevEpisode: currentIndex > 0 ? anime.episodes[currentIndex - 1] : null,
      nextEpisode: currentIndex < anime.episodes.length - 1 ? anime.episodes[currentIndex + 1] : null,
    }
  }, [anime, episode])

  // Главы для SkipChapterButton
  const chapters = useMemo(() => {
    if (!episode?.chapters) {
      return []
    }
    return episode.chapters.map((ch) => ({
      title: ch.title || ch.type,
      startTime: ch.startMs / 1000,
      endTime: ch.endMs / 1000,
    }))
  }, [episode])

  // Вычисляем размеры видео для режима contain
  // contain: вписать по высоте, ширина = высота * aspectRatio
  // cover: заполнить весь контейнер
  const videoStyle = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return styles.videoFull
    }

    if (resizeMode === 'cover') {
      // Cover: заполнить весь контейнер
      return styles.videoFull
    }

    // Contain: вписать сохраняя пропорции
    const containerAspect = containerSize.width / containerSize.height

    if (videoAspectRatio > containerAspect) {
      // Видео шире контейнера — ограничиваем по ширине
      const width = containerSize.width
      const height = width / videoAspectRatio
      return { width, height }
    } else {
      // Видео уже контейнера — ограничиваем по высоте (letterbox)
      const height = containerSize.height
      const width = height * videoAspectRatio
      return { width, height }
    }
  }, [containerSize, resizeMode, videoAspectRatio])

  // Применить режим просмотра к эпизоду (оригинал или озвучка)
  const applyViewingModeToEpisode = useCallback((mode: 'original' | 'dubbed', ep: Episode) => {
    if (mode === 'original') {
      const audio = ep.audioTracks.find(isOriginalAudio) ?? ep.audioTracks[0]
      if (audio?.audioCid) {
        setSelectedExternalAudio(audio)
        setAudioUrl(getEpisodeAudioUrl(ep.id, audio.id, audio.audioCid))
      }
      const sub = ep.subtitleTracks.find((t) => isRussianLanguage(t.language) && !isSignsSubtitles(t))
        ?? ep.subtitleTracks.find((t) => !isSignsSubtitles(t))
        ?? ep.subtitleTracks[0]
        ?? null
      setSelectedSubtitle(sub)
      setSubtitlesEnabled(true)
    } else {
      const audio = ep.audioTracks.find((t) => !isOriginalAudio(t) && t.isDefault)
        ?? ep.audioTracks.find((t) => !isOriginalAudio(t))
        ?? ep.audioTracks[0]
        ?? null
      if (audio?.audioCid) {
        setSelectedExternalAudio(audio)
        setAudioUrl(getEpisodeAudioUrl(ep.id, audio.id, audio.audioCid))
      }
      const signsSub = ep.subtitleTracks.find(isSignsSubtitles) ?? null
      setSelectedSubtitle(signsSub)
      setSubtitlesEnabled(!!signsSub)
    }
  }, [])

  // Мягкая предзагрузка следующего эпизода за 3 мин до конца (прогрев DNS/IPFS gateway)
  useEffect(() => {
    if (!nextEpisode || !duration || duration - currentTime > PREFETCH_THRESHOLD) {
      return
    }
    if (prefetchedEpisodeIdRef.current === nextEpisode.id) {
      return
    }

    prefetchedEpisodeIdRef.current = nextEpisode.id

    const nextVideoUrl = getEpisodeVideoUrl(nextEpisode)
    if (nextVideoUrl?.startsWith('http')) {
      fetch(nextVideoUrl, { method: 'HEAD' }).catch(() => undefined)
    }
    const defaultAudio = nextEpisode.audioTracks.find((t) => t.isDefault) ?? nextEpisode.audioTracks[0]
    if (defaultAudio?.audioCid) {
      const audioUrl = getEpisodeAudioUrl(nextEpisode.id, defaultAudio.id, defaultAudio.audioCid)
      if (audioUrl?.startsWith('http')) {
        fetch(audioUrl, { method: 'HEAD' }).catch(() => undefined)
      }
    }
  }, [currentTime, duration, nextEpisode])

  // Загрузка данных
  useEffect(() => {
    setLoading(true)
    setError(null)
    setShowNextEpisodeOverlay(false)
    setNextEpisodeCancelled(false)
    episodeCompletedRef.current = false
    prefetchedEpisodeIdRef.current = null

    getAnimeDetails(animeId)
      .then((data) => {
        setAnime(data)
        const ep = data.episodes.find((e) => e.id === episodeId)

        if (!ep) {
          setError('Эпизод не найден')
        } else {
          const vUrl = getEpisodeVideoUrl(ep)

          if (!vUrl) {
            setError('Эпизод недоступен для оффлайн просмотра. Скачайте его или подключитесь к серверу.')
          } else {
            setEpisode(ep)
            setVideoUrl(vUrl)

            // Загружаем пути скачанных субтитров и шрифтов
            const dlSubPaths = getDownloadedSubtitlePaths(ep.id)
            setDownloadedSubPaths(dlSubPaths)
            setDownloadedFontDirPath(getDownloadedFontDir(ep.id))

            if (viewingMode !== null) {
              // Применить сохранённый режим просмотра
              applyViewingModeToEpisode(viewingMode, ep)
            } else {
              // Автовыбор аудио: сохранённый индекс → isDefault → первый
              if (ep.audioTracks.length > 0) {
                const preferredTrack = preferredAudioIndex !== undefined && preferredAudioIndex < ep.audioTracks.length
                  ? ep.audioTracks[preferredAudioIndex]
                  : undefined
                const defaultTrack = preferredTrack || ep.audioTracks.find((t) => t.isDefault) || ep.audioTracks[0]
                if (defaultTrack?.audioCid) {
                  setSelectedExternalAudio(defaultTrack)
                  setAudioUrl(getEpisodeAudioUrl(ep.id, defaultTrack.id, defaultTrack.audioCid))
                }
              }

              // Автовыбор субтитров: сохранённый индекс → [1] → [0]
              if (ep.subtitleTracks.length > 0) {
                const preferredSub =
                  preferredSubtitleIndex !== undefined && preferredSubtitleIndex < ep.subtitleTracks.length
                    ? ep.subtitleTracks[preferredSubtitleIndex]
                    : undefined
                const selectedTrack = preferredSub
                  || (ep.subtitleTracks.length > 1 ? ep.subtitleTracks[1] : ep.subtitleTracks[0])
                setSelectedSubtitle(selectedTrack)
              }
            }
          }
        }
      })
      .catch((err) => {
        console.error('Error loading anime:', err)
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      })
      .finally(() => setLoading(false))
  }, [animeId, episodeId, retryCount])

  // Обработчик загрузки видео
  const handleLoad = useCallback((data: OnLoadData) => {
    setVideoLoaded(true)
    setDuration(data.duration)

    if (data.naturalWidth > 0 && data.naturalHeight > 0) {
      setVideoAspectRatio(data.naturalWidth / data.naturalHeight)
      setVideoWidth(data.naturalWidth)
      setVideoHeight(data.naturalHeight)
    }

    // Восстановить позицию после смены аудиодорожки
    if (pendingSeekRef.current !== null) {
      playerRef.current?.seek(pendingSeekRef.current)
      pendingSeekRef.current = null
    } else if (resumePositionRef.current !== null && resumePositionRef.current > 0) {
      // Восстановить позицию из ResumeOverlay или startTime
      playerRef.current?.seek(resumePositionRef.current)
      resumePositionRef.current = null
    }

    setIsPlaying(true)
  }, [])

  // Обработчик прогресса (игнорирует обновления сразу после seek)
  const handleProgress = useCallback(
    (data: OnProgressData) => {
      if (Date.now() < seekLockUntilRef.current) { return }
      setCurrentTime(data.currentTime)

      // Показать NextEpisodeOverlay за 30 сек до конца
      if (
        duration > 0
        && duration - data.currentTime <= NEXT_EPISODE_THRESHOLD
        && nextEpisode
        && !showNextEpisodeOverlay
        && !nextEpisodeCancelled
      ) {
        setShowNextEpisodeOverlay(true)
      }

      // Пометить как просмотренное при входе в главу эндинга
      if (!episodeCompletedRef.current && chapters.length > 0) {
        const ENDING_KEYS = ['ed', 'ending', 'outro', 'credits', 'эндинг', 'титры']
        const inEndingChapter = chapters.some(
          (ch) =>
            data.currentTime >= ch.startTime
            && data.currentTime < ch.endTime
            && ENDING_KEYS.some((k) => ch.title.toLowerCase().includes(k)),
        )
        if (inEndingChapter) {
          episodeCompletedRef.current = true
          saveProgressToServer(episodeId, { currentTime: data.currentTime, completed: true }).catch(() => {
            queueProgressSync(episodeId, { currentTime: data.currentTime, completed: true }).catch(() => undefined)
          })
        }
      }
    },
    [duration, nextEpisode, showNextEpisodeOverlay, nextEpisodeCancelled, chapters, episodeId],
  )

  // Навигация
  const handleBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const navigateToEpisode = useCallback(
    (ep: Episode) => {
      navigation.replace('Player', { animeId, episodeId: ep.id })
    },
    [navigation, animeId],
  )

  // Обработчики плеера
  const handleError = useCallback((err: { code: string; message: string }) => {
    console.error('Video error:', err)
    setError(`Ошибка видео: ${err.message}`)
  }, [])

  const handleEnd = useCallback(() => {
    setIsPlaying(false)
    if (nextEpisode) {
      if (nextEpisodeCancelled) {
        // Пользователь отменил оверлей, но видео закончилось — переходим сразу
        navigateToEpisode(nextEpisode)
      } else {
        setShowNextEpisodeOverlay(true)
      }
    }
  }, [nextEpisode, nextEpisodeCancelled, navigateToEpisode])

  // Обработка зума
  const handleZoomChange = useCallback((scale: number, translateX: number, translateY: number) => {
    setZoomScale(scale)
    setZoomTranslateX(translateX)
    setZoomTranslateY(translateY)
  }, [])

  // Управление воспроизведением
  const handleSeek = useCallback((time: number) => {
    seekLockUntilRef.current = Date.now() + 500 // Игнорировать progress 500ms после seek
    playerRef.current?.seek(time)
    setCurrentTime(time)
  }, [])

  // Пропуск главы — если endTime близко к концу видео, показать NextEpisodeOverlay
  const handleSkipChapter = useCallback(
    (endTime: number) => {
      handleSeek(endTime)
      if (nextEpisode && duration > 0 && duration - endTime <= 10) {
        setShowNextEpisodeOverlay(true)
      }
    },
    [handleSeek, nextEpisode, duration],
  )

  // Управление пультом (D-pad remote control)
  useRemoteControl(
    useMemo(
      () => ({
        onLeft: () => handleSeek(Math.max(0, currentTime - 10)),
        onRight: () => handleSeek(Math.min(duration, currentTime + 10)),
        onUp: () => setSystemVolume(Math.min(1, systemVolume + 0.07)),
        onDown: () => setSystemVolume(Math.max(0, systemVolume - 0.07)),
        onSelect: () => setIsPlaying((prev) => !prev),
        onPlayPause: () => setIsPlaying((prev) => !prev),
        onRewind: () => handleSeek(Math.max(0, currentTime - 30)),
        onFastForward: () => handleSeek(Math.min(duration, currentTime + 30)),
      }),
      [currentTime, duration, systemVolume, setSystemVolume, handleSeek],
    ),
  )

  // Выбор аудиодорожки
  const selectExternalAudio = useCallback(
    (track: ApiAudioTrack) => {
      if (track.audioCid) {
        pendingSeekRef.current = currentTime
        setSelectedExternalAudio(track)
        setAudioUrl(getEpisodeAudioUrl(episodeId, track.id, track.audioCid))
        setVideoLoaded(false)
        // Сохраняем индекс выбранной дорожки для этого сериала
        const trackIndex = episode?.audioTracks.findIndex((t) => t.id === track.id)
        if (trackIndex !== undefined && trackIndex >= 0) {
          setAudioTrackIndex(animeId, trackIndex)
        }
      }
      setShowAudioMenu(false)
    },
    [currentTime, episode, animeId, setAudioTrackIndex],
  )

  // Выбор субтитров
  const selectSubtitle = useCallback(
    (track: SubtitleTrack) => {
      setSelectedSubtitle(track)
      setSubtitlesEnabled(true)
      setShowSubtitleMenu(false)
      // Сохраняем индекс выбранных субтитров для этого сериала
      const trackIndex = episode?.subtitleTracks.findIndex((t) => t.id === track.id)
      if (trackIndex !== undefined && trackIndex >= 0) {
        setSubtitleTrackIndex(animeId, trackIndex)
      }
    },
    [episode, animeId, setSubtitleTrackIndex],
  )

  const getSubtitleDisplayName = useCallback((track: SubtitleTrack): string => {
    if (track.name) {
      return track.name
    }
    if (track.title) {
      return `${track.language.toUpperCase()} (${track.title})`
    }
    if (track.dubGroup) {
      return `${track.language.toUpperCase()} (${track.dubGroup})`
    }
    return track.language.toUpperCase()
  }, [])

  // URL субтитров (скачанные имеют приоритет)
  const subtitleUrl = useMemo(() => {
    if (!subtitlesEnabled || !selectedSubtitle) {
      return null
    }
    // Проверяем скачанный файл
    const dlPath = downloadedSubPaths[selectedSubtitle.id]
    if (dlPath) {
      return dlPath
    }
    // Серверный URL
    if (selectedSubtitle.fileCid) {
      return getSubtitleUrlFromCid(selectedSubtitle)
    }
    return null
  }, [subtitlesEnabled, selectedSubtitle, downloadedSubPaths])

  // Загрузка контента субтитров
  const assContent = useAssContent(selectedSubtitle && isAssFormat(selectedSubtitle.format) ? subtitleUrl : null)
  const srtContent = useSrtContent(selectedSubtitle && isSrtFormat(selectedSubtitle.format) ? subtitleUrl : null)

  // Автоматически разрешаем рендеринг видео если нет сохранённого прогресса
  // (т.е. showResumePrompt никогда не станет true)
  useEffect(() => {
    // Когда хук проверил storage и прогресса нет — разрешаем рендеринг
    if (!watchProgress.showResumePrompt && !userMadeResumeDecision && watchProgress.savedPosition === null) {
      // Небольшая задержка чтобы дать useWatchProgress время загрузить данные
      const timer = setTimeout(() => {
        if (!watchProgress.showResumePrompt) {
          setUserMadeResumeDecision(true)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [watchProgress.showResumePrompt, watchProgress.savedPosition, userMadeResumeDecision])

  // Сохраняем позицию для seek после загрузки видео
  const resumePositionRef = useRef<number | null>(hasExternalStartTime ? initialStartTime! : null)

  const handleResumeFromSaved = useCallback((): number => {
    const position = watchProgress.resumeFromSaved()
    if (position > 0) {
      // Сохраняем позицию для seek после загрузки видео
      resumePositionRef.current = position
    }
    // Разрешаем рендеринг видео
    setUserMadeResumeDecision(true)
    return position
  }, [watchProgress])

  const handleStartFromBeginning = useCallback(() => {
    watchProgress.startFromBeginning()
    resumePositionRef.current = null
    // Разрешаем рендеринг видео
    setUserMadeResumeDecision(true)
  }, [watchProgress])

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Обработчик тапа по видео (от нативного SyncVideoView)
  const handleVideoTap = useCallback(() => {
    if (!lockState.isLocked) {
      controlsVisibility.toggle()
    }
  }, [lockState.isLocked, controlsVisibility])

  // Рендер
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color="#805AD5" />
        <Text style={styles.statusText}>Загрузка...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.retryButton} onPress={() => setRetryCount((c) => c + 1)}>
            <RotateCcw size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>Повторить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleBack}>
            <Text style={styles.buttonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Видео плеер */}
      <View
        style={styles.videoContainer}
        pointerEvents="box-none"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout
          setContainerSize({ width, height })
        }}
      >
        {/* Обёртка с зум-трансформом для видео + субтитров */}
        <View
          style={[
            styles.videoFull,
            styles.zoomWrapper,
            {
              transform: [{ scale: zoomScale }, { translateX: zoomTranslateX }, { translateY: zoomTranslateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Единый контейнер — точно по размеру видео, центрируется zoomWrapper'ом */}
          <View style={videoStyle}>
            {/* Видео рендерится ТОЛЬКО после решения пользователя в ResumeOverlay */}
            {videoUrl && userMadeResumeDecision
              ? (
                <SyncVideoPlayer
                  ref={playerRef}
                  videoSource={videoUrl}
                  audioSource={audioUrl}
                  paused={!isPlaying}
                  volume={volume}
                  volumeBoost={volumeBoost}
                  muted={false}
                  resizeMode={resizeMode}
                  rate={playbackSpeed}
                  style={StyleSheet.absoluteFill}
                  onLoad={handleLoad}
                  onProgress={handleProgress}
                  onError={handleError}
                  onEnd={handleEnd}
                  onTap={handleVideoTap}
                />
              )
              : (
                !videoUrl && <Text style={styles.statusText}>URL видео не найден</Text>
              )}

            {/* ASS субтитры — скрываем в PiP (нечитаемы) */}
            {subtitlesEnabled && assContent && videoLoaded && !pip.isInPipMode && (
              <NativeAssView
                assContent={assContent}
                currentTimeMs={Math.round(currentTime * 1000)}
                videoWidth={videoWidth}
                videoHeight={videoHeight}
                fontDir={downloadedFontDirPath}
                fontScale={subtitleFontScale}
                style={StyleSheet.flatten(StyleSheet.absoluteFill)}
                pointerEvents="none"
              />
            )}

            {/* SRT субтитры — скрываем в PiP (нечитаемы) */}
            {subtitlesEnabled && srtContent && !assContent && videoLoaded && !pip.isInPipMode && (
              <SrtSubtitleView
                srtContent={srtContent}
                currentTimeMs={Math.round(currentTime * 1000)}
                fontSize={18 * subtitleFontScale}
                style={StyleSheet.flatten(StyleSheet.absoluteFill)}
                pointerEvents="none"
              />
            )}
          </View>
        </View>

        {/* Индикатор загрузки — вне зум-обёртки, скрываем в PiP */}
        {!videoLoaded && videoUrl && userMadeResumeDecision && !pip.isInPipMode && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#805AD5" />
            <Text style={styles.statusText}>Загрузка видео...</Text>
          </View>
        )}
      </View>

      {/* GestureOverlay — VLC-style жесты (яркость/громкость/перемотка) */}
      {!lockState.isLocked && videoLoaded && !pip.isInPipMode && (
        <GestureOverlay
          disabled={showNextEpisodeOverlay}
          controlsVisible={controlsVisibility.visible}
          volume={systemVolume}
          onVolumeChange={setSystemVolume}
          volumeBoost={volumeBoost}
          onVolumeBoostChange={setVolumeBoost}
          brightness={brightness}
          onBrightnessChange={setBrightness}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onToggleControls={controlsVisibility.toggle}
          onSpeedChange={setPlaybackSpeed}
          playbackSpeed={playbackSpeed}
          zoomScale={zoomScale}
          onZoomChange={handleZoomChange}
        />
      )}

      {/* Контролы (с автоскрытием и fade-анимацией) — скрываем в PiP */}
      {!lockState.isLocked && !pip.isInPipMode && (
        <FadeView visible={controlsVisibility.visible} style={{ zIndex: 200 }} pointerEvents="box-none">
          {/* Header с градиентом сверху вниз */}
          <View style={styles.headerWrapper}>
            <GradientOverlay position="top" />
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  handleBack()
                }}
              >
                <ArrowLeft size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.headerInfo}>
                <Text style={styles.title} numberOfLines={1}>
                  {anime?.name}
                </Text>
                <Text style={styles.subtitle}>
                  {episode?.seasonName ? `${episode.seasonName} • ` : ''}
                  Эпизод {episode?.number}
                  {episode?.name ? ` • ${episode.name}` : ''}
                </Text>
              </View>

              {/* Только кнопка блокировки в header */}
              <TouchableOpacity
                style={[styles.headerButton, lockState.isLocked && styles.headerButtonActive]}
                onPress={() => {
                  Haptics.medium()
                  lockState.toggle()
                }}
              >
                {lockState.isLocked ? <Lock size={22} color="#FFFFFF" /> : <LockOpen size={22} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Нижняя панель VLC-style с градиентом снизу вверх */}
          <View style={styles.bottomWrapper}>
            <GradientOverlay position="bottom" />
            <View style={styles.bottomControls}>
              {/* Прогресс бар с drag-seek (Reanimated, UI thread) */}
              <SeekBar currentTime={currentTime} duration={duration} onSeek={handleSeek} />

              {/* Кнопки управления VLC-style */}
              <View style={styles.vlcControls}>
                {/* Левая группа */}
                <View style={styles.vlcControlsGroup}>
                  {/* Субтитры */}
                  <TouchableOpacity
                    style={styles.vlcButton}
                    onPress={() => {
                      Haptics.light()
                      setShowSubtitleMenu(true)
                    }}
                    disabled={!episode || episode.subtitleTracks.length === 0}
                  >
                    {subtitlesEnabled
                      ? <Captions size={22} color={episode?.subtitleTracks.length ? '#FFFFFF' : '#666'} />
                      : <CaptionsOff size={22} color="rgba(255,255,255,0.5)" />}
                  </TouchableOpacity>

                  {/* Аудио */}
                  <TouchableOpacity
                    style={styles.vlcButton}
                    onPress={() => {
                      Haptics.light()
                      setShowAudioMenu(true)
                    }}
                    disabled={!episode || episode.audioTracks.length === 0}
                  >
                    <ListMusic size={22} color={episode?.audioTracks.length ? '#FFFFFF' : '#666'} />
                  </TouchableOpacity>

                  {/* Режим просмотра (оригинал / озвучка) */}
                  {episode && episode.audioTracks.length > 0 && (
                    <TouchableOpacity
                      style={styles.vlcButton}
                      onPress={() => {
                        Haptics.light()
                        // Определяем текущий режим по фактическому аудио (viewingMode может быть null)
                        const currentIsOriginal = selectedExternalAudio ? isOriginalAudio(selectedExternalAudio) : true
                        const nextMode = currentIsOriginal ? 'dubbed' : 'original'
                        setViewingMode(nextMode)
                        applyViewingModeToEpisode(nextMode, episode)
                      }}
                    >
                      <Languages
                        size={22}
                        color={selectedExternalAudio && isOriginalAudio(selectedExternalAudio) ? '#805AD5' : '#FFFFFF'}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Масштаб */}
                  <TouchableOpacity
                    style={styles.vlcButton}
                    onPress={() => {
                      Haptics.light()
                      // Сброс зума при переключении масштаба
                      setZoomScale(1.0)
                      setZoomTranslateX(0)
                      setZoomTranslateY(0)
                      const newMode = resizeMode === 'contain' ? 'cover' : 'contain'
                      setResizeMode(newMode)
                      playerRef.current?.setResizeMode(newMode)
                    }}
                  >
                    {resizeMode === 'contain'
                      ? <Maximize2 size={22} color="#FFFFFF" />
                      : <Minimize2 size={22} color="#FFFFFF" />}
                  </TouchableOpacity>
                </View>

                {/* Центральная группа: Prev | -10 | Play | +10 | Next */}
                <View style={styles.vlcControlsCenter}>
                  {/* Prev Episode */}
                  <TouchableOpacity
                    style={[styles.vlcNavButton, !prevEpisode && styles.vlcButtonDisabled]}
                    onPress={() => {
                      if (prevEpisode) {
                        Haptics.medium()
                        navigateToEpisode(prevEpisode)
                      }
                    }}
                    disabled={!prevEpisode}
                  >
                    <SkipBack size={20} color={prevEpisode ? '#FFFFFF' : '#666'} />
                  </TouchableOpacity>

                  {/* -10 сек */}
                  <TouchableOpacity
                    style={styles.vlcSeekButton}
                    onPress={() => {
                      Haptics.light()
                      handleSeek(Math.max(0, currentTime - 10))
                    }}
                  >
                    <Text style={styles.vlcSeekText}>10</Text>
                    <SkipBack size={10} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Play/Pause */}
                  <TouchableOpacity
                    style={styles.vlcPlayButton}
                    onPress={() => {
                      Haptics.light()
                      setIsPlaying(!isPlaying)
                    }}
                  >
                    {isPlaying
                      ? <Pause size={28} color="#FFFFFF" />
                      : <Play size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />}
                  </TouchableOpacity>

                  {/* +10 сек */}
                  <TouchableOpacity
                    style={styles.vlcSeekButton}
                    onPress={() => {
                      Haptics.light()
                      handleSeek(Math.min(duration, currentTime + 10))
                    }}
                  >
                    <Text style={styles.vlcSeekText}>10</Text>
                    <SkipForward size={10} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Next Episode */}
                  <TouchableOpacity
                    style={[styles.vlcNavButton, !nextEpisode && styles.vlcButtonDisabled]}
                    onPress={() => {
                      if (nextEpisode) {
                        Haptics.medium()
                        navigateToEpisode(nextEpisode)
                      }
                    }}
                    disabled={!nextEpisode}
                  >
                    <SkipForward size={20} color={nextEpisode ? '#FFFFFF' : '#666'} />
                  </TouchableOpacity>
                </View>

                {/* Правая группа */}
                <View style={styles.vlcControlsGroupRight}>
                  {/* Скорость */}
                  <TouchableOpacity
                    style={styles.vlcButton}
                    onPress={() => {
                      Haptics.light()
                      setShowSpeedMenu(true)
                    }}
                  >
                    {playbackSpeed === 1.0
                      ? <Gauge size={22} color="#FFFFFF" />
                      : <Text style={styles.vlcSpeedText}>{playbackSpeed}x</Text>}
                  </TouchableOpacity>

                  {/* PiP */}
                  {pip.isPipAvailable && (
                    <TouchableOpacity
                      style={styles.vlcButton}
                      onPress={() => pip.enterPipMode()}
                    >
                      <PictureInPicture2 size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}

                  {/* Настройки */}
                  <TouchableOpacity
                    style={styles.vlcButton}
                    onPress={() => {
                      Haptics.light()
                      setShowSettingsMenu(true)
                    }}
                  >
                    <EllipsisVertical size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </FadeView>
      )}

      {/* Skip Chapter Button — скрываем в PiP */}
      {chapters.length > 0 && !pip.isInPipMode && (
        <SkipChapterButton chapters={chapters} currentTime={currentTime} onSkip={handleSkipChapter} />
      )}

      {/* Lock Overlay — рендерим только когда заблокировано */}
      {lockState.isLocked && !pip.isInPipMode && <LockOverlay lockState={lockState} />}

      {/* Resume Overlay — скрываем в PiP */}
      {!pip.isInPipMode && (
        <ResumeOverlay
          progressState={{
            ...watchProgress,
            resumeFromSaved: handleResumeFromSaved,
            startFromBeginning: handleStartFromBeginning,
          }}
        />
      )}

      {/* Next Episode Overlay — скрываем в PiP */}
      {!pip.isInPipMode && (
        <NextEpisodeOverlay
          visible={showNextEpisodeOverlay}
          nextEpisode={nextEpisode}
          onPlayNext={() => {
            setShowNextEpisodeOverlay(false)
            if (nextEpisode) {
              navigateToEpisode(nextEpisode)
            }
          }}
          onCancel={() => {
            setShowNextEpisodeOverlay(false)
            setNextEpisodeCancelled(true)
          }}
        />
      )}

      {/* Speed Selector Modal */}
      <SpeedSelector
        visible={showSpeedMenu}
        onClose={() => setShowSpeedMenu(false)}
        currentSpeed={playbackSpeed}
        onSelectSpeed={setPlaybackSpeed}
      />

      {/* Player Settings Modal */}
      <PlayerSettingsModal visible={showSettingsMenu} onClose={() => setShowSettingsMenu(false)} />

      {/* Audio Selector Modal */}
      <Modal visible={showAudioMenu} transparent animationType="fade" onRequestClose={() => setShowAudioMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAudioMenu(false)}>
          <View style={styles.trackModalContent}>
            <Text style={styles.trackModalTitle}>Аудиодорожка</Text>
            <ScrollView style={styles.trackModalScroll} showsVerticalScrollIndicator={false}>
              {episode?.audioTracks.map((track) => {
                const isSelected = selectedExternalAudio?.id === track.id
                const lang = LANG_NAMES[track.language] || track.language?.toUpperCase()
                return (
                  <TouchableOpacity
                    key={track.id}
                    style={[styles.trackItem, isSelected && styles.trackItemSelected]}
                    onPress={() => {
                      Haptics.light()
                      selectExternalAudio(track)
                    }}
                    disabled={!track.audioCid}
                  >
                    <View style={styles.trackItemRow}>
                      <Text style={[styles.trackTitle, !track.audioCid && styles.trackDisabled]} numberOfLines={1}>
                        {track.name || track.title || 'Дорожка'}
                      </Text>
                      <View style={styles.trackTags}>
                        {lang && <Text style={styles.trackTagText}>{lang}</Text>}
                        {track.dubGroup && <Text style={styles.trackTagText}>• {track.dubGroup}</Text>}
                        {track.codec && <Text style={styles.trackTagMuted}>{track.codec.toUpperCase()}</Text>}
                        {!track.audioCid && <Text style={styles.trackUnavailable}>недоступно</Text>}
                      </View>
                    </View>
                    {isSelected && <Text style={styles.trackCheck}>✓</Text>}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Subtitle Selector Modal */}
      <Modal
        visible={showSubtitleMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubtitleMenu(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSubtitleMenu(false)}>
          <View style={styles.trackModalContent}>
            <Text style={styles.trackModalTitle}>Субтитры</Text>
            <ScrollView style={styles.trackModalScroll} showsVerticalScrollIndicator={false}>
              {/* Выкл */}
              <TouchableOpacity
                style={[styles.trackItem, !subtitlesEnabled && styles.trackItemSelected]}
                onPress={() => {
                  Haptics.light()
                  setSubtitlesEnabled(false)
                  setShowSubtitleMenu(false)
                }}
              >
                <Text style={styles.trackTitle}>Выкл</Text>
                {!subtitlesEnabled && <Text style={styles.trackCheck}>✓</Text>}
              </TouchableOpacity>

              {episode?.subtitleTracks.map((track) => {
                const isSelected = subtitlesEnabled && selectedSubtitle?.id === track.id
                const lang = LANG_NAMES[track.language] || track.language?.toUpperCase()
                return (
                  <TouchableOpacity
                    key={track.id}
                    style={[styles.trackItem, isSelected && styles.trackItemSelected]}
                    onPress={() => {
                      Haptics.light()
                      selectSubtitle(track)
                    }}
                    disabled={!track.fileCid}
                  >
                    <View style={styles.trackItemRow}>
                      <Text style={[styles.trackTitle, !track.fileCid && styles.trackDisabled]} numberOfLines={1}>
                        {getSubtitleDisplayName(track)}
                      </Text>
                      <View style={styles.trackTags}>
                        {lang && <Text style={styles.trackTagText}>{lang}</Text>}
                        <Text style={styles.trackTagMuted}>{track.format.toUpperCase()}</Text>
                        {!track.fileCid && <Text style={styles.trackUnavailable}>недоступно</Text>}
                      </View>
                    </View>
                    {isSelected && <Text style={styles.trackCheck}>✓</Text>}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
  },
  videoFull: {
    width: '100%',
    height: '100%',
  },
  zoomWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCover: {
    ...StyleSheet.absoluteFill,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },

  // Header wrapper с градиентом
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 55, 72, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(45, 55, 72, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonActive: {
    backgroundColor: 'rgba(128, 90, 213, 0.8)',
  },
  headerButtonIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerButtonIconDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  headerIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerIconLarge: {
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerIconDim: {
    opacity: 0.5,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Bottom wrapper с градиентом
  bottomWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomControls: {
    padding: 16,
    paddingBottom: 24,
  },
  // Стили seekbar вынесены в SeekBar.tsx компонент

  // VLC-style контролы
  vlcControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  vlcControlsGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vlcControlsGroupRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  vlcControlsCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vlcNavButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vlcButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vlcButtonDisabled: {
    opacity: 0.4,
  },
  vlcSeekButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vlcSeekText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  vlcPlayButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vlcSpeedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Модалы дорожек (аудио/субтитры)
  trackModalContent: {
    backgroundColor: '#1A202C',
    borderRadius: 16,
    paddingBottom: 16,
    width: '80%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  trackModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  trackModalScroll: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#2D3748',
  },
  trackItemSelected: {
    backgroundColor: '#553C9A',
  },
  trackItemRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginRight: 8,
  },
  trackTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  trackDisabled: {
    opacity: 0.4,
  },
  trackTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackTagText: {
    fontSize: 13,
    color: '#CBD5E0',
  },
  trackTagMuted: {
    fontSize: 11,
    color: '#718096',
  },
  trackCheck: {
    fontSize: 18,
    color: '#48BB78',
  },
  trackUnavailable: {
    fontSize: 11,
    color: '#E53E3E',
    fontStyle: 'italic',
  },

  // Common
  statusText: {
    color: '#A0AEC0',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#F56565',
    fontSize: 16,
    textAlign: 'center',
    padding: 16,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#805AD5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#2D3748',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
