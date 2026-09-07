'use client'

/**
 * VideoPlayer — обёртка над Shaka Player из `@letar/video-player-react`/`@letar/video-player-core`.
 *
 * Без раздельных аудиодорожек (`usesSeparateAudioRef` всегда `false` — выбор внешней
 * аудиодорожки, найденной `@letar/folder-scan`, отдельная задача плана) и без глав
 * (`MediaInfoWasmProber` ещё не подключён — `main/page.tsx`).
 */

import { Box, Center, IconButton, Spinner } from '@chakra-ui/react'
import type { PlaybackSpeed } from '@letar/video-player-core'
import {
  PlayerLoadingOverlay,
  SharedPlayerControls,
  SubtitleOverlay,
  Tooltip,
  useAutoHideControls,
  useKeyboardShortcuts,
  usePlayerControls,
  usePlayerState,
  useShakaPlayer,
  useSubtitles,
} from '@letar/video-player-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

export interface VideoPlayerSubtitle {
  /** URL к субтитрам — обязателен для `srt`/`vtt` (нативный `<track>`), опционален для `ass`/`ssa` */
  url?: string
  /** Содержимое .ass/.ssa (встроенные субтитры без извлечённого файла) — альтернатива `url` */
  content?: string
  format: 'ass' | 'ssa' | 'srt' | 'vtt'
  fonts: string[]
}

export interface VideoPlayerProps {
  src: string
  subtitle: VideoPlayerSubtitle | null
  autoPlay?: boolean
  startTime?: number
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}

/** Минимальный интерфейс Shaka Player, ожидаемый `useShakaPlayer` */
type ShakaModule = Parameters<typeof useShakaPlayer>[0]['Shaka']

/**
 * shaka-player ссылается на `self` в топ-левел коде пакета — падает при Next.js
 * SSR/пререндере статического экспорта. Динамический `import()` внутри эффекта гарантирует,
 * что модуль выполняется только в браузере (тот же паттерн, что в `apps/animatrona`).
 */
export function VideoPlayer(props: VideoPlayerProps) {
  const [Shaka, setShaka] = useState<ShakaModule | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const mod = (await import('shaka-player')).default as unknown as ShakaModule
      if (!cancelled) {
        setShaka(mod)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!Shaka) {
    return (
      <Center h="full" bg="black">
        <Spinner size="xl" color="white" />
      </Center>
    )
  }

  return <ShakaVideoPlayer {...props} Shaka={Shaka} />
}

function ShakaVideoPlayer({
  src,
  subtitle,
  autoPlay = true,
  startTime = 0,
  onTimeUpdate,
  onEnded,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  Shaka,
}: VideoPlayerProps & { Shaka: ShakaModule }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const usesSeparateAudioRef = useRef(false)

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
  } = usePlayerState({})

  const { videoRef, isVideoReady, isLoading } = useShakaPlayer({
    src,
    startTime,
    autoPlay,
    containerRef,
    audioRef,
    usesSeparateAudioRef,
    Shaka,
    onDurationChange: setDuration,
  })

  const controls = usePlayerControls({
    videoRef,
    audioRef,
    containerRef,
    usesSeparateAudio: false,
    usesSeparateAudioRef,
    duration: state.duration,
    setIsMuted,
  })

  const { showControls, resetHideTimeout } = useAutoHideControls({ isPlaying: state.isPlaying })

  // Не даём экрану гаснуть посреди серии — снимается на паузе и при размонтировании (смена
  // эпизода/выход из плеера, см. `key={currentVideoPath}` в page.tsx)
  useEffect(() => {
    void window.electronAPI.power.setPreventSleep(state.isPlaying)
  }, [state.isPlaying])
  useEffect(() => {
    return () => {
      void window.electronAPI.power.setPreventSleep(false)
    }
  }, [])

  useKeyboardShortcuts({
    videoRef,
    togglePlay: controls.togglePlay,
    skipTime: controls.skipTime,
    toggleMute: controls.toggleMute,
    toggleFullscreen: controls.toggleFullscreen,
  })

  const { loadNative } = useSubtitles({ videoRef, isVideoReady })

  // Нативные субтитры (SRT/VTT) — грузим через track-элемент после готовности видео
  useEffect(() => {
    if (
      !isVideoReady || !subtitle || !subtitle.url
      || (subtitle.format !== 'srt' && subtitle.format !== 'vtt')
    ) {
      return
    }
    void loadNative(subtitle.url)
  }, [isVideoReady, subtitle, loadNative])

  const handlePlaybackSpeedChange = useCallback(
    (speed: PlaybackSpeed) => {
      setPlaybackSpeed(speed)
      const video = videoRef.current
      if (video) {
        video.playbackRate = speed
      }
    },
    [setPlaybackSpeed, videoRef],
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdate?.(video.currentTime, video.duration)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }
    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('volumechange', handleVolumeChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [
    isVideoReady,
    videoRef,
    setCurrentTime,
    setIsPlaying,
    setVolume,
    setIsMuted,
    setIsFullscreen,
    onTimeUpdate,
    onEnded,
  ])

  const navigationSlot = (hasPrev || hasNext)
    ? (
      <>
        <Tooltip content="Предыдущий эпизод">
          <IconButton
            aria-label="Previous episode"
            variant="ghost"
            colorPalette="whiteAlpha"
            size="sm"
            disabled={!hasPrev}
            onClick={onPrev}
          >
            <LuChevronLeft color="var(--chakra-colors-player-control)" />
          </IconButton>
        </Tooltip>
        <Tooltip content="Следующий эпизод">
          <IconButton
            aria-label="Next episode"
            variant="ghost"
            colorPalette="whiteAlpha"
            size="sm"
            disabled={!hasNext}
            onClick={onNext}
          >
            <LuChevronRight color="var(--chakra-colors-player-control)" />
          </IconButton>
        </Tooltip>
      </>
    )
    : undefined

  return (
    <Box
      ref={containerRef}
      position="relative"
      bg="black"
      w="full"
      h="full"
      cursor={showControls ? 'default' : 'none'}
      onMouseMove={resetHideTimeout}
      onClick={controls.togglePlay}
      onDoubleClick={controls.toggleFullscreen}
    >
      <audio ref={audioRef} />

      {subtitle && (subtitle.format === 'ass' || subtitle.format === 'ssa') && isVideoReady && (
        <SubtitleOverlay
          videoRef={videoRef}
          subtitleUrl={subtitle.url}
          subtitleContent={subtitle.content}
          fonts={subtitle.fonts}
          topOffset={0}
          bottomOffset={showControls ? 80 : 0}
        />
      )}

      <PlayerLoadingOverlay isLoading={isLoading} />

      <SharedPlayerControls
        isPlaying={state.isPlaying}
        currentTime={state.currentTime}
        duration={state.duration}
        volume={state.volume}
        isMuted={state.isMuted}
        isFullscreen={state.isFullscreen}
        isVisible={showControls}
        onTogglePlay={controls.togglePlay}
        onSeek={controls.handleSeek}
        onVolumeChange={controls.handleVolumeChange}
        onToggleMute={controls.toggleMute}
        onToggleFullscreen={controls.toggleFullscreen}
        onSkipTime={controls.skipTime}
        playbackSpeed={playbackSpeed}
        onPlaybackSpeedChange={handlePlaybackSpeedChange}
        navigationSlot={navigationSlot}
      />
    </Box>
  )
}
