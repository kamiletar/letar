'use client'

/**
 * EpisodePlayer — полноэкранный плеер эпизода раздачи, открытой по CID.
 *
 * Видео/аудио/субтитры — отдельные файлы в IPFS (`ReleaseEpisodeManifest`, читается по
 * `manifestCid` через `window.electronAPI.manifest.openEpisode`), воспроизводятся напрямую с
 * HTTP-шлюза Kubo (`window.electronAPI.ipfs.getGatewayUrl`) — не через IPC (видео может быть
 * гигабайты, IPC на структурный клонирование байтов не годится). Обёртка над Shaka Player из
 * `@letar/video-player-react`/`@letar/video-player-core`, тот же паттерн, что
 * `apps/animatrona-folder-player` (VideoPlayer.tsx), но: аудио всегда раздельное (отдельные
 * файлы, не embedded-дорожки MKV), без глав/превью-спрайта (эти документы вне объёма плеера —
 * см. PLAN.md «Только просмотр»).
 *
 * Прогресс просмотра (WatchProgress) — резюме позиции и выбор дорожек читается при открытии
 * эпизода, сохраняется периодически + на паузе/окончании/закрытии (unmount). Ключ —
 * `releaseKey` (см. `getReleaseKey` в main/ipc/manifest.handlers.ts) + номер эпизода.
 */

import { Box, Center, IconButton, Spinner, Text } from '@chakra-ui/react'
import type { PlaybackSpeed } from '@letar/video-player-core'
import {
  PlayerLoadingOverlay,
  SharedPlayerControls,
  SubtitleOverlay,
  useAudioSync,
  useAutoHideControls,
  useKeyboardShortcuts,
  usePlayerControls,
  useShakaPlayer,
  useSubtitles,
} from '@letar/video-player-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuX } from 'react-icons/lu'

import type { ReleaseEpisodeManifest, ReleaseEpisodeSubtitleTrack } from '../../../main/ipc/manifest.handlers'
import { getGatewayBaseUrl, setGatewayBaseUrl, toIpfsUrl } from '../../lib/media-url'
import { AudioTrackSelector } from './AudioTrackSelector'
import { SubtitleTrackSelector } from './SubtitleTrackSelector'

export interface EpisodePlayerProps {
  manifestCid: string
  /** Стабильный ключ раздачи (см. `getReleaseKey` в main/ipc/manifest.handlers.ts) — для WatchProgress */
  releaseKey: string
  /** Номер эпизода — вместе с releaseKey образует ключ WatchProgress */
  episodeNumber: number
  episodeLabel: string
  onClose: () => void
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}

/** Досматриваем — не считать «незаконченным» последние несколько секунд ролика/интро выходных титров */
const COMPLETED_THRESHOLD_SEC = 3
/** Не резюмировать с самого начала — если бросили в первые секунды, начинаем заново */
const RESUME_MIN_TIME_SEC = 5
const SAVE_PROGRESS_INTERVAL_MS = 10_000

/** Читаемая подпись дорожки: язык + название, если есть */
function formatTrackLabel(language: string, title: string): string {
  const lang = (language || 'und').toUpperCase()
  return title ? `${title} (${lang})` : lang
}

/** Минимальный интерфейс Shaka Player, ожидаемый `useShakaPlayer` */
type ShakaModule = Parameters<typeof useShakaPlayer>[0]['Shaka']

/**
 * shaka-player ссылается на `self` в топ-левел коде пакета — падает при Next.js SSR/пререндере
 * статического экспорта. Динамический `import()` внутри эффекта гарантирует, что модуль
 * выполняется только в браузере (тот же паттерн, что в `apps/animatrona-folder-player`).
 */
export function EpisodePlayer(props: EpisodePlayerProps) {
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
      <Center position="fixed" inset={0} zIndex={100} bg="black">
        <Spinner size="xl" color="white" />
      </Center>
    )
  }

  return <ShakaEpisodePlayer {...props} Shaka={Shaka} />
}

function ShakaEpisodePlayer(
  { manifestCid, releaseKey, episodeNumber, episodeLabel, onClose, hasPrev, hasNext, onPrev, onNext, Shaka }:
    & EpisodePlayerProps
    & {
      Shaka: ShakaModule
    },
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const usesSeparateAudioRef = useRef(true)
  /** Позиция для резюме — выставляется в эффекте загрузки манифеста, применяется, когда видео готово */
  const resumeTimeRef = useRef<number | null>(null)

  const [manifest, setManifest] = useState<ReleaseEpisodeManifest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedAudioId, setSelectedAudioId] = useState('')
  const [selectedSubtitleId, setSelectedSubtitleId] = useState('off')

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)

  // Загрузка манифеста эпизода — запускает Kubo-ноду (если ещё не запущена) и читает EpisodeManifest.
  // Заодно читает WatchProgress — резюме позиции и выбор дорожек с прошлого просмотра, если он был.
  useEffect(() => {
    let cancelled = false
    setManifest(null)
    setLoadError(null)
    setSelectedAudioId('')
    setSelectedSubtitleId('off')
    resumeTimeRef.current = null

    void (async () => {
      try {
        if (!getGatewayBaseUrl()) {
          const gatewayUrl = await window.electronAPI.ipfs.getGatewayUrl()
          setGatewayBaseUrl(gatewayUrl)
        }
        const data = await window.electronAPI.manifest.openEpisode(manifestCid)
        if (cancelled) {
          return
        }

        let audioId = data.audioTracks.find((t) => t.isDefault)?.id ?? data.audioTracks[0]?.id ?? ''
        let subtitleId = data.subtitleTracks.find((t) => t.isDefault)?.id ?? 'off'

        // Прогресс — не критичен для просмотра, ошибка чтения не должна ронять открытие эпизода
        try {
          const progress = await window.electronAPI.watchProgress.get(releaseKey, episodeNumber)
          if (progress && !cancelled) {
            if (!progress.completed && progress.currentTime > RESUME_MIN_TIME_SEC) {
              resumeTimeRef.current = progress.currentTime
            }
            if (progress.selectedAudioTrackId && data.audioTracks.some((t) => t.id === progress.selectedAudioTrackId)) {
              audioId = progress.selectedAudioTrackId
            }
            subtitleId = progress.selectedSubtitleTrackId
                && data.subtitleTracks.some((t) => t.id === progress.selectedSubtitleTrackId)
              ? progress.selectedSubtitleTrackId
              : 'off'
          }
        } catch {
          // резюме недоступно — начинаем эпизод сначала, это не ошибка воспроизведения
        }

        if (cancelled) {
          return
        }
        setManifest(data)
        setSelectedAudioId(audioId)
        setSelectedSubtitleId(subtitleId)
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить манифест эпизода')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [manifestCid, releaseKey, episodeNumber])

  const videoSrc = manifest ? toIpfsUrl(manifest.video.cid) : null

  const { videoRef, isVideoReady, isLoading } = useShakaPlayer({
    src: videoSrc ?? '',
    autoPlay: true,
    containerRef,
    audioRef,
    usesSeparateAudioRef,
    Shaka,
    onDurationChange: setDuration,
    onError: (err) => setLoadError(err.message),
  })

  useAudioSync({
    videoRef,
    audioRef,
    usesSeparateAudio: true,
    isVideoReady,
    currentAudioTrackId: selectedAudioId,
  })

  // Резюме позиции с прошлого просмотра — как только видео готово принять seek
  useEffect(() => {
    if (!isVideoReady || resumeTimeRef.current === null) {
      return
    }
    const video = videoRef.current
    if (video) {
      video.currentTime = resumeTimeRef.current
    }
    resumeTimeRef.current = null
  }, [isVideoReady, videoRef])

  const audioOptions = useMemo(
    () => (manifest?.audioTracks ?? []).map((t) => ({ id: t.id, label: formatTrackLabel(t.language, t.title) })),
    [manifest],
  )
  const selectedAudioTrack = useMemo(
    () => manifest?.audioTracks.find((t) => t.id === selectedAudioId) ?? null,
    [manifest, selectedAudioId],
  )
  const audioSrc = selectedAudioTrack ? toIpfsUrl(selectedAudioTrack.cid) : null

  const subtitleOptions = useMemo(
    () => [
      { id: 'off', label: 'Выключены' },
      ...(manifest?.subtitleTracks ?? []).map((t) => ({ id: t.id, label: formatTrackLabel(t.language, t.title) })),
    ],
    [manifest],
  )
  const selectedSubtitleTrack = useMemo<ReleaseEpisodeSubtitleTrack | null>(
    () => manifest?.subtitleTracks.find((t) => t.id === selectedSubtitleId) ?? null,
    [manifest, selectedSubtitleId],
  )

  const controls = usePlayerControls({
    videoRef,
    audioRef,
    containerRef,
    usesSeparateAudio: true,
    usesSeparateAudioRef,
    duration,
    setIsMuted,
  })

  const { showControls, resetHideTimeout } = useAutoHideControls({ isPlaying })

  useKeyboardShortcuts({
    videoRef,
    togglePlay: controls.togglePlay,
    skipTime: controls.skipTime,
    toggleMute: controls.toggleMute,
    toggleFullscreen: controls.toggleFullscreen,
  })

  const { loadNative } = useSubtitles({ videoRef, isVideoReady })

  // Нативные субтитры (SRT/VTT) — через track-элемент. ASS/SSA — через SubtitleOverlay ниже.
  useEffect(() => {
    if (!isVideoReady || !selectedSubtitleTrack?.cid) {
      return
    }
    if (selectedSubtitleTrack.format !== 'srt' && selectedSubtitleTrack.format !== 'vtt') {
      return
    }
    const url = toIpfsUrl(selectedSubtitleTrack.cid)
    if (url) {
      void loadNative(url)
    }
  }, [isVideoReady, selectedSubtitleTrack, loadNative])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)
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
  }, [isVideoReady, videoRef])

  const saveProgress = useCallback(() => {
    const video = videoRef.current
    if (!video || !isVideoReady || !video.duration) {
      return
    }
    void window.electronAPI.watchProgress.upsert({
      releaseKey,
      episodeNumber,
      currentTime: video.currentTime,
      duration: video.duration,
      completed: video.currentTime >= video.duration - COMPLETED_THRESHOLD_SEC,
      selectedAudioTrackId: selectedAudioId || null,
      selectedSubtitleTrackId: selectedSubtitleId === 'off' ? null : selectedSubtitleId,
    })
  }, [videoRef, isVideoReady, releaseKey, episodeNumber, selectedAudioId, selectedSubtitleId])

  // Периодическое сохранение прогресса + на паузе/окончании/закрытии плеера (cleanup при размонтировании)
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const interval = setInterval(() => {
      if (!video.paused) {
        saveProgress()
      }
    }, SAVE_PROGRESS_INTERVAL_MS)

    video.addEventListener('pause', saveProgress)
    video.addEventListener('ended', saveProgress)

    return () => {
      clearInterval(interval)
      video.removeEventListener('pause', saveProgress)
      video.removeEventListener('ended', saveProgress)
      saveProgress()
    }
  }, [videoRef, saveProgress])

  const handlePlaybackSpeedChange = useCallback(
    (speed: PlaybackSpeed) => {
      setPlaybackSpeed(speed)
      const video = videoRef.current
      if (video) {
        video.playbackRate = speed
      }
    },
    [videoRef],
  )

  const prevSlot = (hasPrev || hasNext)
    ? (
      <IconButton
        aria-label="Предыдущий эпизод"
        variant="ghost"
        colorPalette="whiteAlpha"
        size="sm"
        disabled={!hasPrev}
        onClick={onPrev}
      >
        <LuChevronLeft color="var(--chakra-colors-player-control)" />
      </IconButton>
    )
    : undefined

  const nextSlot = (hasPrev || hasNext)
    ? (
      <IconButton
        aria-label="Следующий эпизод"
        variant="ghost"
        colorPalette="whiteAlpha"
        size="sm"
        disabled={!hasNext}
        onClick={onNext}
      >
        <LuChevronRight color="var(--chakra-colors-player-control)" />
      </IconButton>
    )
    : undefined

  return (
    <Box
      ref={containerRef}
      position="fixed"
      inset={0}
      zIndex={100}
      bg="black"
      cursor={showControls ? 'default' : 'none'}
      onMouseMove={resetHideTimeout}
      onClick={controls.togglePlay}
      onDoubleClick={controls.toggleFullscreen}
    >
      <audio ref={audioRef} src={audioSrc ?? undefined} />

      {selectedSubtitleTrack
        && (selectedSubtitleTrack.format === 'ass' || selectedSubtitleTrack.format === 'ssa')
        && selectedSubtitleTrack.cid
        && isVideoReady && (
        <SubtitleOverlay
          videoRef={videoRef}
          subtitleUrl={toIpfsUrl(selectedSubtitleTrack.cid) ?? undefined}
          fonts={(selectedSubtitleTrack.fonts ?? [])
            .map((f) => toIpfsUrl(f.cid))
            .filter((url): url is string => url !== null)}
          topOffset={0}
          bottomOffset={showControls ? 80 : 0}
        />
      )}

      <PlayerLoadingOverlay isLoading={isLoading || !manifest} />

      {loadError && (
        <Center position="absolute" inset={0} px={6}>
          <Text color="fg.error" bg="blackAlpha.800" p={4} borderRadius="md" textAlign="center">
            {loadError}
          </Text>
        </Center>
      )}

      <Box
        position="absolute"
        top={4}
        left={4}
        right={4}
        zIndex={30}
        opacity={showControls ? 1 : 0}
        transition="opacity 0.2s"
        pointerEvents={showControls ? 'auto' : 'none'}
        display="flex"
        alignItems="center"
        gap={3}
      >
        <IconButton
          aria-label="Закрыть плеер"
          variant="ghost"
          colorPalette="whiteAlpha"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <LuX />
        </IconButton>
        <Text color="white" fontWeight="medium">{episodeLabel}</Text>
      </Box>

      <SharedPlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        isVisible={showControls}
        onTogglePlay={controls.togglePlay}
        onSeek={controls.handleSeek}
        onVolumeChange={controls.handleVolumeChange}
        onToggleMute={controls.toggleMute}
        onToggleFullscreen={controls.toggleFullscreen}
        onSkipTime={controls.skipTime}
        playbackSpeed={playbackSpeed}
        onPlaybackSpeedChange={handlePlaybackSpeedChange}
        beforeControlsSlot={prevSlot}
        afterControlsSlot={nextSlot}
        trackSelectorSlot={
          <>
            <SubtitleTrackSelector
              options={subtitleOptions}
              selectedId={selectedSubtitleId}
              onSelect={setSelectedSubtitleId}
            />
            <AudioTrackSelector options={audioOptions} selectedId={selectedAudioId} onSelect={setSelectedAudioId} />
          </>
        }
      />
    </Box>
  )
}
