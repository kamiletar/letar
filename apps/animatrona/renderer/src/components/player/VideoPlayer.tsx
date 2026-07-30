'use client'

/**
 * VideoPlayer - Компонент видеоплеера на базе Shaka Player
 *
 * Поддерживает:
 * - Воспроизведение локальных файлов через media:// протокол
 * - Множественные аудио/видео дорожки
 * - Субтитры (VTT, SRT, ASS через SubtitlesOctopus)
 * - Горячие клавиши
 * - Полноэкранный режим
 *
 * Рефакторинг v2: логика вынесена в хуки, UI — в подкомпоненты
 */

import { Box, Icon, IconButton } from '@chakra-ui/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuPictureInPicture } from 'react-icons/lu'

import { useGlobalVideoStore } from '@/components/global-video'

import {
  PLAYBACK_SPEEDS,
  type PlaybackSpeed,
  PlayerLoadingOverlay,
  SharedPlayerControls,
  SubtitleOverlay,
  Tooltip,
} from '@letar/video-player-react'
import { PlayerHeader, type VideoInfo, VideoInfoOverlay } from './_components'
import {
  useAutoHideControls,
  useKeyboardShortcuts,
  usePlayerControls,
  usePlayerState,
  useSubtitleManagement,
} from './_hooks'

import { NativeSubtitleOverlay } from './NativeSubtitleOverlay'
import { PlayerContextProvider } from './PlayerContext'
import type { VideoPlayerProps, VideoPlayerRef } from './types'

/**
 * VideoPlayer компонент
 */
export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer(
  {
    src,
    videoMetadata,
    autoPlay = false,
    startTime = 0,
    showControls = true,
    onTimeUpdate,
    onEnded,
    onError,
    onPlayStateChange,
    audioTracks,
    currentAudioTrackId,
    onAudioTrackChange: _onAudioTrackChange,
    subtitlePath,
    subtitleFormat: subtitleFormatProp,
    subtitleFonts = [],
    chapters,
    onChapterSeek,
    hasPrevEpisode,
    hasNextEpisode,
    onPrevEpisode,
    onNextEpisode,
    prevEpisodeTooltip,
    nextEpisodeTooltip,
    headerLeft,
    headerCenter,
    headerRight,
    externalAudioManaged = false,
    spriteUrl,
    spriteCues,
  },
  ref
) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  // Audio element берётся из GlobalVideoProvider через store
  const audioRef = useRef<HTMLAudioElement>(null)

  // Refs для callback props — стабилизируют dependency array Effect 2,
  // предотвращая постоянное переподключение event listeners
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onEndedRef = useRef(onEnded)
  const onPlayStateChangeRef = useRef(onPlayStateChange)
  onTimeUpdateRef.current = onTimeUpdate
  onEndedRef.current = onEnded
  onPlayStateChangeRef.current = onPlayStateChange

  // Состояние для оверлея информации о видео
  const [showVideoInfo, setShowVideoInfo] = useState(false)

  // Состояние Picture-in-Picture
  const [isPiP, setIsPiP] = useState(false)

  // Хук состояния плеера
  const {
    state,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsMuted,
    setIsFullscreen,
    playbackSpeed,
    setPlaybackSpeed,
    subtitleFormat,
    usesSeparateAudio,
    usesSeparateAudioRef,
  } = usePlayerState({
    audioTracks,
    currentAudioTrackId,
    subtitlePath,
    subtitleFormatOverride: subtitleFormatProp,
  })

  // === Persistent video из GlobalVideoProvider ===
  // Video element живёт в layout и перемещается через appendChild.
  // НЕ создаём новый — используем из store.
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const globalVideoElement = useGlobalVideoStore((s) => s.videoElement)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // autoPlay через ref — используется в обработчике `loadeddata`, который навешивается один раз
  // на весь жизненный цикл video-элемента (см. эффект ниже), а не пересоздаётся на каждый рендер
  const autoPlayRef = useRef(autoPlay)
  autoPlayRef.current = autoPlay

  // Перемещаем persistent video element в контейнер VideoPlayer
  useEffect(() => {
    const container = videoContainerRef.current
    const video = globalVideoElement
    if (!container || !video) {
      setIsVideoReady(false)
      setIsLoading(true)
      return
    }

    // Перемещаем в контейнер плеера
    container.appendChild(video)
    videoRef.current = video

    // Видео уже загружено (Shaka Player в Provider) — сразу готово. `loadeddata` в этом случае
    // уже отгремел до маунта компонента и повторно не сработает — автоплей проверяем и здесь.
    if (video.readyState > 0) {
      setIsVideoReady(true)
      setIsLoading(false)
      setDuration(video.duration)
      if (autoPlayRef.current && video.paused) {
        video.play().catch(() => {
          /* ignore */
        })
      }
    }

    return () => {
      videoRef.current = null
      setIsVideoReady(false)
    }
  }, [globalVideoElement, setDuration])

  // `loadeddata` персистентного video-элемента — навешивается ОДИН РАЗ на весь жизненный цикл
  // приложения (globalVideoElement создаётся один раз в GlobalVideoProvider и никогда не
  // меняется), поэтому срабатывает на КАЖДУЮ смену src, а не только на первый маунт этого
  // компонента. Без этого автопродолжение в папочном режиме плеера (goNext() внутри той же
  // смонтированной страницы /player, без навигации/ремаунта VideoPlayer) молча грузило следующую
  // серию и оставляло её на паузе — старая логика вызывала `video.play()` только в эффекте выше
  // с deps `[globalVideoElement, ...]`, а он не перезапускается при смене эпизода, т.к. сам
  // video-элемент не меняется. В /watch тот же баг маскировался: переход между сериями там —
  // это навигация на другой route, которая ремонтит VideoPlayer целиком.
  useEffect(() => {
    const video = globalVideoElement
    if (!video) {
      return
    }

    const onLoadedData = () => {
      setIsVideoReady(true)
      setIsLoading(false)
      setDuration(video.duration)
      if (autoPlayRef.current && video.paused) {
        video.play().catch(() => {
          /* ignore */
        })
      }
    }

    video.addEventListener('loadeddata', onLoadedData)
    return () => video.removeEventListener('loadeddata', onLoadedData)
  }, [globalVideoElement, setDuration])

  // Хук автоскрытия контролов
  const { showControls: showControlsOverlay, resetHideTimeout } = useAutoHideControls({
    isPlaying: state.isPlaying,
  })

  // Хук управления воспроизведением
  const controls = usePlayerControls({
    videoRef,
    audioRef,
    containerRef,
    usesSeparateAudio,
    usesSeparateAudioRef,
    duration: state.duration,
    setIsMuted,
  })

  // Функции управления скоростью воспроизведения
  const handlePlaybackSpeedChange = useCallback(
    (speed: PlaybackSpeed) => {
      setPlaybackSpeed(speed)
      if (videoRef.current) {
        videoRef.current.playbackRate = speed
      }
      // Синхронизируем audio если используется раздельная дорожка
      if (audioRef.current) {
        audioRef.current.playbackRate = speed
      }
    },
    [setPlaybackSpeed]
  )

  const adjustPlaybackSpeed = useCallback(
    (delta: number) => {
      const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed)
      if (currentIndex === -1) {
        return
      }

      const newIndex = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, currentIndex + Math.sign(delta)))
      const newSpeed = PLAYBACK_SPEEDS[newIndex]
      handlePlaybackSpeedChange(newSpeed)
    },
    [playbackSpeed, handlePlaybackSpeedChange]
  )

  // Переключение оверлея информации о видео
  const toggleVideoInfo = useCallback(() => {
    setShowVideoInfo((prev) => !prev)
  }, [])

  /**
   * Одиночный клик по кадру — пауза/воспроизведение.
   *
   * Задержки нет намеренно: пауза должна отзываться сразу. Браузер на двойном клике
   * присылает три события — `click` (detail=1) → `click` (detail=2) → `dblclick`, поэтому
   * второй click гасим по `detail`, а изменение состояния от первого откатывает
   * `handleVideoDoubleClick`. Итог двойного клика: полный экран, состояние
   * воспроизведения то же, что было до него.
   */
  const handleVideoClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      // Часть двойного клика — обработается в onDoubleClick
      if (event.detail > 1) {
        return
      }
      controls.togglePlay()
    },
    [controls]
  )

  /** Двойной клик — полный экран (плюс откат паузы от первого клика двойного) */
  const handleVideoDoubleClick = useCallback(() => {
    controls.togglePlay()
    controls.toggleFullscreen()
  }, [controls])

  // Переключение Picture-in-Picture
  const togglePiP = useCallback(async () => {
    const video = videoRef.current
    if (!video) {
      return
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture()
      }
    } catch (error) {
      console.warn('[VideoPlayer] PiP error:', error)
    }
  }, [])

  // Хук горячих клавиш
  useKeyboardShortcuts({
    videoRef,
    togglePlay: controls.togglePlay,
    skipTime: controls.skipTime,
    toggleMute: controls.toggleMute,
    toggleFullscreen: controls.toggleFullscreen,
    adjustPlaybackSpeed,
    toggleVideoInfo,
  })

  // Хук субтитров
  const { vttUrl } = useSubtitleManagement({
    videoRef,
    subtitlePath,
    subtitleFormat,
  })

  // Блокировка сна монитора при воспроизведении
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const api = window.electronAPI
    if (!api?.app?.setPowerSavePlayback) {
      return
    }

    const handlePlayPowerSave = () => {
      api.app.setPowerSavePlayback(true)
    }

    const handlePausePowerSave = () => {
      api.app.setPowerSavePlayback(false)
    }

    video.addEventListener('play', handlePlayPowerSave)
    video.addEventListener('pause', handlePausePowerSave)
    video.addEventListener('ended', handlePausePowerSave)

    // Отключаем блокировку при размонтировании
    return () => {
      video.removeEventListener('play', handlePlayPowerSave)
      video.removeEventListener('pause', handlePausePowerSave)
      video.removeEventListener('ended', handlePausePowerSave)
      api.app.setPowerSavePlayback(false)
    }
  }, [isVideoReady])

  // События видео — callback props через refs для стабильного dependency array.
  // Без refs: onTimeUpdate менялся каждый рендер → effect постоянно
  // переподключал listeners → timeupdate пропускался → время застревало на 0:00.
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdateRef.current?.(video.currentTime, video.duration)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      onPlayStateChangeRef.current?.(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
      onPlayStateChangeRef.current?.(false)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onPlayStateChangeRef.current?.(false)
      onEndedRef.current?.()
    }

    const handleDurationChange = () => {
      setDuration(video.duration)
    }

    const handleVolumeChange = () => {
      setVolume(video.volume)
      // В режиме раздельных дорожек video.muted всегда true,
      // поэтому isMuted контролируется отдельно через audio element.
      // Аналогично для внешнего аудио (externalAudioManaged),
      // где video.muted = true устанавливается useExternalAudio.
      if (!usesSeparateAudioRef.current && !externalAudioManaged) {
        setIsMuted(video.muted)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [
    isVideoReady,
    setCurrentTime,
    setIsPlaying,
    setDuration,
    setVolume,
    setIsMuted,
    usesSeparateAudioRef,
    externalAudioManaged,
  ])

  // Fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [setIsFullscreen])

  // Picture-in-Picture events
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleEnterPiP = () => setIsPiP(true)
    const handleLeavePiP = () => setIsPiP(false)

    video.addEventListener('enterpictureinpicture', handleEnterPiP)
    video.addEventListener('leavepictureinpicture', handleLeavePiP)

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP)
      video.removeEventListener('leavepictureinpicture', handleLeavePiP)
    }
  }, [isVideoReady]) // Перезапускаем когда video готов

  // Публичный API через ref
  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seek: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time
      }
    },
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    getDuration: () => videoRef.current?.duration ?? 0,
    setVolume: (vol: number) => {
      if (videoRef.current) {
        videoRef.current.volume = vol
      }
    },
    getVolume: () => videoRef.current?.volume ?? 1,
    toggleFullscreen: controls.toggleFullscreen,
    getVideoElement: () => videoRef.current,
  }))

  // Подготовка данных для оверлея информации о видео
  const videoInfo = useMemo<VideoInfo>(() => {
    return {
      filePath: src,
      videoCodec: videoMetadata?.videoCodec,
      videoWidth: videoMetadata?.videoWidth,
      videoHeight: videoMetadata?.videoHeight,
      videoBitrate: videoMetadata?.videoBitrate,
      videoBitDepth: videoMetadata?.videoBitDepth,
      audioCodec: videoMetadata?.audioCodec,
      audioBitrate: videoMetadata?.audioBitrate,
      audioChannels: videoMetadata?.audioChannels,
      subtitleFormat: videoMetadata?.subtitleFormat,
      subtitleLanguage: videoMetadata?.subtitleLanguage,
      fileSize: videoMetadata?.fileSize,
      duration: state.duration,
    }
  }, [src, videoMetadata, state.duration])

  // Контекст для Portal в fullscreen режиме
  const playerContextValue = useMemo(() => ({ containerRef }), [])

  // Слот навигации по эпизодам
  const navigationSlot = useMemo(() => {
    if (!hasPrevEpisode && !hasNextEpisode) {
      return undefined
    }
    return (
      <>
        <Tooltip content={prevEpisodeTooltip || 'Предыдущий эпизод'}>
          <IconButton
            aria-label="Previous episode"
            variant="ghost"
            colorPalette="whiteAlpha"
            size="sm"
            disabled={!hasPrevEpisode}
            onClick={onPrevEpisode}
          >
            <Icon as={LuChevronLeft} color="player.control" />
          </IconButton>
        </Tooltip>
        <Tooltip content={nextEpisodeTooltip || 'Следующий эпизод'}>
          <IconButton
            aria-label="Next episode"
            variant="ghost"
            colorPalette="whiteAlpha"
            size="sm"
            disabled={!hasNextEpisode}
            onClick={onNextEpisode}
          >
            <Icon as={LuChevronRight} color="player.control" />
          </IconButton>
        </Tooltip>
      </>
    )
  }, [hasPrevEpisode, hasNextEpisode, onPrevEpisode, onNextEpisode, prevEpisodeTooltip, nextEpisodeTooltip])

  // Слот дополнительных кнопок (PiP)
  const extraControlsSlot = useMemo(
    () => (
      <Tooltip content={isPiP ? 'Выйти из PiP' : 'Картинка в картинке'}>
        <IconButton
          aria-label={isPiP ? 'Exit PiP' : 'Enter PiP'}
          variant="ghost"
          colorPalette="whiteAlpha"
          size="sm"
          onClick={togglePiP}
        >
          <Icon as={LuPictureInPicture} color={isPiP ? 'primary.fg' : 'player.control'} />
        </IconButton>
      </Tooltip>
    ),
    [isPiP, togglePiP]
  )

  return (
    <Box
      ref={containerRef}
      position="relative"
      bg="black"
      width="100%"
      height="100%"
      cursor={showControlsOverlay ? 'default' : 'none'}
      onMouseMove={resetHideTimeout}
      onClick={handleVideoClick}
      onDoubleClick={handleVideoDoubleClick}
    >
      <PlayerContextProvider value={playerContextValue}>
        {/*
          Контейнер для video элемента (создаётся программно в useEffect).

          ⚠️ Здесь НЕ должно быть onClick={e => e.stopPropagation()}: контейнер растянут на
          100%×100%, поэтому такой обработчик глушил клик по самому кадру и пауза срабатывала
          только по чёрным полосам вокруг видео. Контролы и хедер (SharedPlayerControls,
          PlayerHeader) гасят всплытие у себя сами, так что двойной toggle не возникает.
        */}
        <div ref={videoContainerRef} style={{ width: '100%', height: '100%' }} data-testid="player-video-surface" />

        {/* Audio элемент для раздельных дорожек управляется GlobalVideoProvider */}

        {/* ASS/SSA субтитры через SubtitlesOctopus — только после загрузки видео */}
        {subtitlePath && subtitleFormat === 'ass' && isVideoReady && (
          <SubtitleOverlay
            videoRef={videoRef}
            subtitleUrl={subtitlePath}
            fonts={subtitleFonts}
            topOffset={showControlsOverlay ? 60 : 0}
            bottomOffset={showControlsOverlay ? 80 : 0}
          />
        )}

        {/* Нативные субтитры (SRT/VTT) — кастомный оверлей поверх видео */}
        {vttUrl && subtitleFormat === 'native' && <NativeSubtitleOverlay videoRef={videoRef} vttUrl={vttUrl} />}

        {/* Верхняя панель (header) */}
        {showControls && (
          <PlayerHeader
            headerLeft={headerLeft}
            headerCenter={headerCenter}
            headerRight={headerRight}
            isVisible={showControlsOverlay}
          />
        )}

        {/* Оверлей загрузки */}
        <PlayerLoadingOverlay isLoading={isLoading} />

        {/* Оверлей информации о видео (клавиша I) */}
        <VideoInfoOverlay isVisible={showVideoInfo} info={videoInfo} />

        {/* Контролы (shared компонент из @letar/video-player-react) */}
        {showControls && (
          <SharedPlayerControls
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            duration={state.duration}
            volume={state.volume}
            isMuted={state.isMuted}
            isFullscreen={state.isFullscreen}
            isVisible={showControlsOverlay}
            onTogglePlay={controls.togglePlay}
            onSeek={controls.handleSeek}
            onVolumeChange={controls.handleVolumeChange}
            onToggleMute={controls.toggleMute}
            onToggleFullscreen={controls.toggleFullscreen}
            onSkipTime={controls.skipTime}
            chapters={chapters}
            onChapterSeek={onChapterSeek}
            playbackSpeed={playbackSpeed}
            onPlaybackSpeedChange={handlePlaybackSpeedChange}
            navigationSlot={navigationSlot}
            extraControlsSlot={extraControlsSlot}
            spriteUrl={spriteUrl}
            spriteCues={spriteCues}
          />
        )}
      </PlayerContextProvider>
    </Box>
  )
})

// Re-export типов для обратной совместимости
export type { AudioTrackInfo, VideoPlayerProps, VideoPlayerRef } from './types'
