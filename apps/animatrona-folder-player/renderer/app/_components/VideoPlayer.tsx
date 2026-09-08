'use client'

/**
 * VideoPlayer — обёртка над Shaka Player из `@letar/video-player-react`/`@letar/video-player-core`.
 *
 * Без раздельных аудиодорожек (`usesSeparateAudioRef` всегда `false` — выбор внешней
 * аудиодорожки, найденной `@letar/folder-scan`, отдельная задача плана) и без глав
 * (`MediaInfoWasmProber` ещё не подключён — `main/page.tsx`).
 */

import { Box, Center, IconButton, Spinner } from '@chakra-ui/react'
import type { MediaChapter } from '@letar/folder-scan'
import type { PlaybackSpeed } from '@letar/video-player-core'
import {
  ChapterSkipButton,
  parseSpriteCues,
  PlayerLoadingOverlay,
  SharedPlayerControls,
  type SpriteCue,
  SubtitleOverlay,
  Tooltip,
  useAudioTracks,
  useAutoHideControls,
  useKeyboardShortcuts,
  usePlayerControls,
  usePlayerState,
  useShakaPlayer,
  useSubtitles,
} from '@letar/video-player-react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

import { useChapterSkip } from '../_hooks/use-chapter-skip'
import { toMediaUrl } from '../_lib/media-url'
import { AudioTrackSelector } from './AudioTrackSelector'

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
  /**
   * Реальный путь к файлу на диске (без `media://`), с которого читает `src` — нужен отдельно
   * от `src`, чтобы нарезать превью-спрайт через ffmpeg (main-процесс работает с путями, не
   * с протоколом). При Hi10P/AC3 и т.п. это путь к УЖЕ подготовленной копии из `transcode`,
   * при обычном файле — тот же путь, что закодирован в `src`.
   */
  filePath: string
  /** Главы файла (OP/ED, ffprobe) — `undefined`, если ffmpeg недоступен или глав в файле нет */
  chapters?: MediaChapter[]
  subtitle: VideoPlayerSubtitle | null
  autoPlay?: boolean
  startTime?: number
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  /** Кнопка выбора дорожки субтитров (`SubtitleTrackSelector`) — рендерится в `SharedPlayerControls` */
  trackSelectorSlot?: ReactNode
}

/** Минимальный интерфейс Shaka Player, ожидаемый `useShakaPlayer` */
type ShakaModule = Parameters<typeof useShakaPlayer>[0]['Shaka']

/** Читаемая подпись аудиодорожки для меню: язык + название, если есть */
function formatAudioTrackLabel(language: string, label: string): string {
  const lang = (language || 'und').toUpperCase()
  return label ? `${label} (${lang})` : lang
}

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
  filePath,
  chapters: mediaChapters,
  subtitle,
  autoPlay = true,
  startTime = 0,
  onTimeUpdate,
  onEnded,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  trackSelectorSlot,
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

  const { videoRef, playerRef, isVideoReady, isLoading } = useShakaPlayer({
    src,
    startTime,
    autoPlay,
    containerRef,
    audioRef,
    usesSeparateAudioRef,
    Shaka,
    onDurationChange: setDuration,
  })

  // Аудиодорожки внутри уже загруженного файла (не путать с внешними аудиофайлами из
  // @letar/folder-scan — той задачи ещё нет). См. риск в PLAN.md §17: не проверено эмпирически
  // на всех кодеках/контейнерах, что Chromium реально отдаёт несколько дорожек.
  const { audioTracks, selectAudioTrack } = useAudioTracks({ playerRef, isVideoReady })
  const audioOptions = useMemo(
    () => audioTracks.map((t) => ({ id: String(t.audioId), label: formatAudioTrackLabel(t.language, t.label) })),
    [audioTracks],
  )
  const selectedAudioId = useMemo(() => {
    const active = audioTracks.find((t) => t.active)
    return active ? String(active.audioId) : (audioOptions[0]?.id ?? '')
  }, [audioTracks, audioOptions])
  const handleSelectAudio = useCallback((id: string) => selectAudioTrack(Number(id)), [selectAudioTrack])

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

  // Превью кадров для перемотки (PLAN.md §10.1) — нарезается ffmpeg'ом В ФОНЕ, уже после
  // старта воспроизведения: требует полного прохода по файлу и на серию занимает десятки
  // секунд, задерживать из-за него начало просмотра нельзя. Появляется само, когда готово.
  const [spriteUrl, setSpriteUrl] = useState<string | undefined>(undefined)
  const [spriteCues, setSpriteCues] = useState<SpriteCue[] | undefined>(undefined)
  // Нарезаем ровно один раз на файл — duration стабилизируется не сразу (Shaka сообщает
  // промежуточные значения), а перезапускать нарезку на каждое уточнение не нужно
  const spriteRequestedForRef = useRef<string | null>(null)

  useEffect(() => {
    setSpriteUrl(undefined)
    setSpriteCues(undefined)
    spriteRequestedForRef.current = null
    // Смена файла (следующий эпизод) обрывает нарезку предыдущего — иначе ffmpeg продолжал бы
    // работать в фоне над файлом, который уже не смотрят
    return () => {
      void window.electronAPI.sprite.cancel()
    }
  }, [filePath])

  useEffect(() => {
    if (!isVideoReady || !state.duration || spriteRequestedForRef.current === filePath) {
      return
    }
    spriteRequestedForRef.current = filePath

    let cancelled = false
    void window.electronAPI.sprite.generate(filePath, state.duration).then((result) => {
      if (cancelled || !result.success || !result.spritePath || !result.vtt) {
        return
      }
      setSpriteUrl(toMediaUrl(result.spritePath))
      setSpriteCues(parseSpriteCues(result.vtt))
    })

    return () => {
      cancelled = true
    }
  }, [isVideoReady, filePath, state.duration])

  // Главы (OP/ED) — кнопка «Пропустить опенинг» + маркеры на прогресс-баре (PLAN.md §7)
  const { chapters, chapterInfos } = useChapterSkip(mediaChapters, state.duration)

  // MPC-раскладка транспортных кнопок: prev-эпизод — перемотка назад — play — перемотка вперёд — next-эпизод
  const prevEpisodeSlot = (hasPrev || hasNext)
    ? (
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
    )
    : undefined

  const nextEpisodeSlot = (hasPrev || hasNext)
    ? (
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

      {chapters.length > 0 && (
        <ChapterSkipButton chapters={chapters} currentTime={state.currentTime} onSeek={controls.seek} />
      )}

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
        beforeControlsSlot={prevEpisodeSlot}
        afterControlsSlot={nextEpisodeSlot}
        trackSelectorSlot={
          <>
            {trackSelectorSlot}
            <AudioTrackSelector options={audioOptions} selectedId={selectedAudioId} onSelect={handleSelectAudio} />
          </>
        }
        spriteUrl={spriteUrl}
        spriteCues={spriteCues}
        chapters={chapterInfos}
        onChapterSeek={controls.seek}
      />
    </Box>
  )
}
