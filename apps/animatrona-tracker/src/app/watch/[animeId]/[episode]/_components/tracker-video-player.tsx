'use client'

/**
 * TrackerVideoPlayer — полноценный веб-плеер для IPFS контента
 *
 * Адаптация WebVideoPlayer из animatrona-web для трекера.
 * Логика вынесена в хуки: use-shaka-player, use-audio-sync,
 * use-watch-progress, use-keyboard-shortcuts, use-chapter-nav.
 */

import { Box, Center, IconButton, Text, VStack } from '@chakra-ui/react'
import type { EpisodeManifest, ManifestAudioTrack, ManifestSubtitleTrack } from '@letar/animatrona-types'
import {
  AutoplayBlockedOverlay,
  ChapterList,
  ChapterSkipButton,
  parseSpriteCues,
  type PlaybackSpeed,
  PlayerLoadingOverlay,
  SharedPlayerControls,
  type SpriteCue,
  SubtitleOverlay,
  Tooltip,
} from '@letar/video-player-react'
import Link from 'next/link'
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuLanguages, LuList, LuSkipForward } from 'react-icons/lu'

import { getAudioUrl, getFontUrls, getSubtitleUrl, getVideoUrl, toPlayerUrl } from '@/lib/media-url'

import { useAudioSync } from '../_hooks/use-audio-sync'
import { useChapterNav } from '../_hooks/use-chapter-nav'
import { useKeyboardShortcuts } from '../_hooks/use-keyboard-shortcuts'
import { useShakaPlayer } from '../_hooks/use-shaka-player'
import { useWatchProgress } from '../_hooks/use-watch-progress'
import { KeyboardShortcutsOverlay } from './keyboard-shortcuts-overlay'
import { PlayerHeader } from './player-header'
import { TrackSelector } from './track-selector'
import { VideoInfo } from './video-info'

export interface TrackerVideoPlayerProps {
  /** Манифест эпизода */
  manifest: EpisodeManifest
  /** Slug аниме (shikimoriId) */
  animeSlug: string
  /** ID аниме в БД (для API watch-progress) */
  animeId: string
  /** Номер эпизода */
  episodeNum: number
  /** Начальное время (секунды) */
  startTime?: number
  /** Начальный индекс аудиодорожки */
  initialAudioTrack?: number
  /** Начальный индекс субтитров */
  initialSubtitleTrack?: number
  /** Начальный trackMode (из БД: per-anime > профиль > null) */
  initialTrackMode?: 'RUSSIAN_DUB' | 'ORIGINAL_SUB' | null
}

// ─── Track selection helpers ────────────────────────────────────────────

type TrackMode = 'RUSSIAN_DUB' | 'ORIGINAL_SUB'
const TRACK_MODE_KEY = 'animatrona-track-mode'
const ORIGINAL_LANGUAGES = ['ja', 'jpn', 'japanese', 'en', 'eng', 'english']
const RUSSIAN_LANGUAGES = ['ru', 'rus', 'russian']

function isRussianTrack(track: { language: string; title: string }): boolean {
  const lang = track.language.toLowerCase()
  if (RUSSIAN_LANGUAGES.includes(lang)) {
    return true
  }
  const title = track.title.toLowerCase()
  return title.includes('рус') || title.includes('rus')
}

function isOriginalTrack(track: { language: string }): boolean {
  return ORIGINAL_LANGUAGES.includes(track.language.toLowerCase())
}

function isSignsSubtitle(track: { title: string; dubGroup?: string }): boolean {
  const title = track.title.toLowerCase()
  const dubGroup = track.dubGroup?.toLowerCase() || ''
  return title.includes('sign') || title.includes('надпис') || dubGroup.includes('sign') || dubGroup.includes('надпис')
}

function selectAudioIndex(tracks: ManifestAudioTrack[], mode: TrackMode): number {
  const readyTracks = tracks.map((t, i) => ({ ...t, idx: i })).filter((t) => t.cid)
  if (readyTracks.length === 0) {
    return -1
  }
  if (mode === 'RUSSIAN_DUB') {
    const russian = readyTracks.find((t) => isRussianTrack(t))
    return russian?.idx ?? readyTracks[0].idx
  }
  const original = readyTracks.find((t) => isOriginalTrack(t))
  return original?.idx ?? readyTracks[0].idx
}

function selectSubtitleIndex(tracks: ManifestSubtitleTrack[], mode: TrackMode, audioIsRussian: boolean): number {
  if (tracks.length === 0) {
    return -1
  }
  if (mode === 'RUSSIAN_DUB') {
    if (audioIsRussian) {
      const signsIdx = tracks.findIndex((t) => isSignsSubtitle(t))
      return signsIdx >= 0 ? signsIdx : -1
    }
    const fullRusIdx = tracks.findIndex((t) => isRussianTrack(t) && !isSignsSubtitle(t))
    if (fullRusIdx >= 0) {
      return fullRusIdx
    }
    const fullIdx = tracks.findIndex((t) => !isSignsSubtitle(t))
    return fullIdx >= 0 ? fullIdx : 0
  }
  const fullRusIdx = tracks.findIndex((t) => isRussianTrack(t) && !isSignsSubtitle(t))
  if (fullRusIdx >= 0) {
    return fullRusIdx
  }
  const fullIdx = tracks.findIndex((t) => !isSignsSubtitle(t))
  return fullIdx >= 0 ? fullIdx : 0
}

function checkAV1Support(): boolean {
  if (typeof MediaSource === 'undefined') {
    return false
  }
  return MediaSource.isTypeSupported('video/webm; codecs="av01.0.08M.08"')
}

// ─── Компонент ──────────────────────────────────────────────────────────

export function TrackerVideoPlayer({
  manifest,
  animeSlug,
  animeId,
  episodeNum,
  startTime = 0,
  initialAudioTrack = 0,
  initialSubtitleTrack = -1,
  initialTrackMode,
}: TrackerVideoPlayerProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)

  // State: UI
  const [showVideoInfo, setShowVideoInfo] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRateState] = useState<PlaybackSpeed>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [av1Supported, setAv1Supported] = useState(true)

  // State: дорожки
  const [audioTrackIndex, setAudioTrackIndex] = useState(initialAudioTrack)
  const [subtitleTrackIndex, setSubtitleTrackIndex] = useState(initialSubtitleTrack)
  const [trackMode, setTrackMode] = useState<TrackMode>(() => {
    if (initialTrackMode) {
      return initialTrackMode
    }
    if (typeof window === 'undefined') {
      return 'RUSSIAN_DUB'
    }
    return (localStorage.getItem(TRACK_MODE_KEY) as TrackMode) || 'RUSSIAN_DUB'
  })

  // Вычисляемые URL
  const videoUrl = useMemo(() => getVideoUrl(manifest.video), [manifest.video])
  const usesSeparateAudio = !!manifest.audioTracks[audioTrackIndex]?.cid
  const currentAudioTrack = manifest.audioTracks[audioTrackIndex]
  const currentSubtitle = subtitleTrackIndex >= 0 ? manifest.subtitleTracks[subtitleTrackIndex] : null
  const audioUrl = useMemo(
    () => (usesSeparateAudio && currentAudioTrack ? getAudioUrl(currentAudioTrack) : null),
    [usesSeparateAudio, currentAudioTrack],
  )
  const subtitleUrl = useMemo(() => (currentSubtitle ? getSubtitleUrl(currentSubtitle) : null), [currentSubtitle])
  const fontUrls = useMemo(
    () => (currentSubtitle?.fonts ? getFontUrls(currentSubtitle.fonts) : []),
    [currentSubtitle?.fonts],
  )
  const isAssSubtitle = currentSubtitle?.format === 'ass' || currentSubtitle?.format === 'ssa'

  // ─── Хуки ──────────────────────────────────────────────────────────

  const {
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
  } = useShakaPlayer({
    videoUrl,
    startTime,
    containerRef,
    usesSeparateAudio,
    initialDuration: manifest.video.durationMs ? manifest.video.durationMs / 1000 : 0,
  })

  const { audioRef, usesSeparateAudioRef, isAudioBlocked, setIsAudioBlocked } = useAudioSync({
    videoRef,
    audioUrl,
    usesSeparateAudio,
    isVideoReady,
    audioTrackIndex,
  })

  useWatchProgress({
    videoRef,
    animeId,
    animeSlug,
    episodeNum,
    duration,
    audioTrackIndex,
    subtitleTrackIndex,
    navigation: manifest.navigation,
  })

  const {
    chapters,
    chapterInfos,
    autoSkipEnabled,
    toggleAutoSkip,
    handleChapterSeek,
    showChapterList,
    toggleChapterList,
    closeChapterList,
  } = useChapterNav({
    manifestChapters: manifest.chapters,
    currentTime,
    videoRef,
  })

  // Sprite thumbnails
  const [spriteCues, setSpriteCues] = useState<SpriteCue[]>([])
  const spriteUrl = useMemo(() => {
    const thumbs = manifest.thumbnails
    return thumbs?.spriteCid ? toPlayerUrl(thumbs.spriteCid) : undefined
  }, [manifest.thumbnails])

  useEffect(() => {
    const thumbs = manifest.thumbnails
    let vttCidToFetch: string | undefined
    if (thumbs?.vttCid) {
      vttCidToFetch = thumbs.vttCid
    } else if (manifest.thumbnailsCid) {
      let cancelled = false
      fetch(toPlayerUrl(manifest.thumbnailsCid))
        .then((r) => r.json())
        .then((doc: { thumbnails?: { vttCid?: string } }) => {
          if (cancelled || !doc.thumbnails?.vttCid) {
            return
          }
          return fetch(toPlayerUrl(doc.thumbnails.vttCid)).then((r) => r.text())
        })
        .then((vtt) => {
          if (cancelled || !vtt) {
            return
          }
          setSpriteCues(parseSpriteCues(vtt))
        })
        .catch(() => {
          /* игнорируем */
        })
      return () => {
        cancelled = true
      }
    }
    if (!vttCidToFetch) {
      return
    }
    let cancelled = false
    fetch(toPlayerUrl(vttCidToFetch))
      .then((r) => r.text())
      .then((vtt) => {
        if (!cancelled) {
          setSpriteCues(parseSpriteCues(vtt))
        }
      })
      .catch(() => {
        /* игнорируем */
      })
    return () => {
      cancelled = true
    }
  }, [manifest.thumbnails, manifest.thumbnailsCid])

  // AV1 проверка
  useEffect(() => {
    setAv1Supported(checkAV1Support())
  }, [])

  // Auto-hide контролов
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setShowControls(true)
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [isPlaying])

  useEffect(() => {
    resetHideTimeout()
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [isPlaying, resetHideTimeout])

  // Fullscreen
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // ─── Callbacks ─────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }, [])

  const handleSeek = useCallback(
    (value: number[]) => {
      const video = videoRef.current
      if (!video || duration <= 0) {
        return
      }
      video.currentTime = (value[0] / 100) * duration
    },
    [duration],
  )

  const handleVolumeChange = useCallback((value: number[]) => {
    const video = videoRef.current
    if (!video) {
      return
    }
    const vol = value[0] / 100
    video.volume = vol
    if (vol > 0) {
      video.muted = false
    }
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    const audio = audioRef.current
    if (usesSeparateAudio && audio) {
      audio.muted = !audio.muted
    } else if (video) {
      video.muted = !video.muted
    }
  }, [usesSeparateAudio])

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }, [])

  const skipTime = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration || 0))
  }, [])

  const handlePlaybackSpeedChange = useCallback((speed: PlaybackSpeed) => {
    const video = videoRef.current
    const audio = audioRef.current
    if (video) {
      video.playbackRate = speed
      setPlaybackRateState(speed)
    }
    if (usesSeparateAudioRef.current && audio) {
      audio.playbackRate = speed
    }
  }, [])

  const handleAudioChange = useCallback((index: number) => {
    setAudioTrackIndex(index)
  }, [])

  const handleSubtitleChange = useCallback((index: number) => {
    setSubtitleTrackIndex(index)
  }, [])

  const toggleVideoInfo = useCallback(() => {
    setShowVideoInfo((prev) => !prev)
  }, [])

  // Быстрое переключение дорожек
  const toggleTrackMode = useCallback(() => {
    const newMode: TrackMode = trackMode === 'RUSSIAN_DUB' ? 'ORIGINAL_SUB' : 'RUSSIAN_DUB'
    setTrackMode(newMode)
    localStorage.setItem(TRACK_MODE_KEY, newMode)
    // Сохраняем per-anime через API
    fetch('/api/watch-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        animeId,
        episodeNumber: episodeNum,
        currentTime: videoRef.current?.currentTime ?? 0,
        duration: duration || videoRef.current?.duration || 0,
        audioTrackIndex,
        subtitleTrackIndex,
        trackMode: newMode,
      }),
    }).catch(() => {
      /* тихо */
    })

    const newAudioIdx = selectAudioIndex(manifest.audioTracks, newMode)
    if (newAudioIdx >= 0) {
      handleAudioChange(newAudioIdx)
    }

    const effectiveAudioIdx = newAudioIdx >= 0 ? newAudioIdx : audioTrackIndex
    const selectedAudio = manifest.audioTracks[effectiveAudioIdx]
    const audioIsRus = selectedAudio ? isRussianTrack(selectedAudio) : false
    const newSubIdx = selectSubtitleIndex(manifest.subtitleTracks, newMode, audioIsRus)
    handleSubtitleChange(newSubIdx)
  }, [
    trackMode,
    animeId,
    episodeNum,
    duration,
    audioTrackIndex,
    subtitleTrackIndex,
    manifest.audioTracks,
    manifest.subtitleTracks,
    handleAudioChange,
    handleSubtitleChange,
  ])

  // Разблокировка autoplay
  const handleUnblockAudio = useCallback(() => {
    const audio = audioRef.current
    const video = videoRef.current
    if (!audio || !video) {
      return
    }
    audio
      .play()
      .then(() => {
        setIsAudioBlocked(false)
        audio.currentTime = video.currentTime
        audio.playbackRate = video.playbackRate
      })
      .catch((err) => console.error('[Player] audio unlock:', err))
  }, [])

  const handleUnblockAll = useCallback(() => {
    const video = videoRef.current
    const audio = audioRef.current
    video
      ?.play()
      .then(() => setIsVideoBlocked(false))
      .catch(console.error)
    if (audio && usesSeparateAudio) {
      audio
        .play()
        .then(() => {
          setIsAudioBlocked(false)
          if (video) {
            audio.currentTime = video.currentTime
          }
        })
        .catch(console.error)
    }
  }, [usesSeparateAudio])

  // Горячие клавиши
  useKeyboardShortcuts({
    videoRef,
    togglePlay,
    skipTime,
    toggleMute,
    toggleFullscreen,
    handlePlaybackSpeedChange,
    playbackRate,
    toggleVideoInfo,
    toggleTrackMode,
    showShortcuts,
    setShowShortcuts,
  })

  // ─── UI Slots ──────────────────────────────────────────────────────

  // Навигация по эпизодам
  const navigationSlot = useMemo(() => {
    const hasPrev = !!manifest.navigation?.prevEpisode
    const hasNext = !!manifest.navigation?.nextEpisode
    if (!hasPrev && !hasNext) {
      return undefined
    }
    return (
      <>
        {hasPrev && (
          <Tooltip content="Предыдущий эпизод">
            <Link href={`/watch/${animeSlug}/${episodeNum - 1}`}>
              <IconButton aria-label="Предыдущий эпизод" variant="ghost" colorPalette="whiteAlpha" size="sm">
                <LuChevronLeft />
              </IconButton>
            </Link>
          </Tooltip>
        )}
        {hasNext && (
          <Tooltip content="Следующий эпизод">
            <Link href={`/watch/${animeSlug}/${episodeNum + 1}`}>
              <IconButton aria-label="Следующий эпизод" variant="ghost" colorPalette="whiteAlpha" size="sm">
                <LuChevronRight />
              </IconButton>
            </Link>
          </Tooltip>
        )}
      </>
    )
  }, [manifest.navigation, animeSlug, episodeNum])

  // Правый слот хедера
  const headerRightSlot = useMemo(
    () => (
      <>
        {chapters.length > 0 && (
          <Tooltip content="Список глав">
            <IconButton
              aria-label="Список глав"
              size="sm"
              variant="ghost"
              color={showChapterList ? 'purple.300' : 'white'}
              onClick={toggleChapterList}
              _hover={{ bg: 'whiteAlpha.200' }}
            >
              <LuList />
            </IconButton>
          </Tooltip>
        )}
        {chapters.length > 0 && (
          <Tooltip content={autoSkipEnabled ? 'Автопропуск OP/ED: вкл' : 'Автопропуск OP/ED: выкл'}>
            <IconButton
              aria-label="Автопропуск OP/ED"
              size="sm"
              variant="ghost"
              color={autoSkipEnabled ? 'purple.300' : 'white'}
              onClick={toggleAutoSkip}
              _hover={{ bg: 'whiteAlpha.200' }}
            >
              <LuSkipForward />
            </IconButton>
          </Tooltip>
        )}
        {manifest.audioTracks.length > 1 && (
          <Tooltip content={trackMode === 'RUSSIAN_DUB' ? 'Озвучка + надписи (T)' : 'Оригинал + полные (T)'}>
            <IconButton
              aria-label="Переключить дорожки"
              size="sm"
              variant={trackMode === 'ORIGINAL_SUB' ? 'solid' : 'ghost'}
              colorPalette={trackMode === 'ORIGINAL_SUB' ? 'purple' : undefined}
              color={trackMode === 'ORIGINAL_SUB' ? undefined : 'white'}
              onClick={toggleTrackMode}
              _hover={{ bg: trackMode === 'ORIGINAL_SUB' ? undefined : 'whiteAlpha.200' }}
            >
              <LuLanguages />
            </IconButton>
          </Tooltip>
        )}
        <TrackSelector
          audioTracks={manifest.audioTracks}
          audioTrackIndex={audioTrackIndex}
          onAudioChange={handleAudioChange}
          subtitleTracks={manifest.subtitleTracks}
          subtitleTrackIndex={subtitleTrackIndex}
          onSubtitleChange={handleSubtitleChange}
        />
      </>
    ),
    [
      chapters.length,
      showChapterList,
      toggleChapterList,
      autoSkipEnabled,
      toggleAutoSkip,
      trackMode,
      toggleTrackMode,
      manifest.audioTracks,
      audioTrackIndex,
      handleAudioChange,
      manifest.subtitleTracks,
      subtitleTrackIndex,
      handleSubtitleChange,
    ],
  )

  // ─── Render ────────────────────────────────────────────────────────

  // AV1 не поддерживается
  if (!av1Supported) {
    return (
      <Center bg="black" minH="100dvh">
        <VStack gap={4}>
          <Text color="red.400" fontSize="lg">
            Ваш браузер не поддерживает AV1
          </Text>
          <Text color="gray.400" fontSize="sm" textAlign="center" maxW="400px">
            Для просмотра используйте Chrome, Edge или Opera.
          </Text>
        </VStack>
      </Center>
    )
  }

  // Ошибка
  if (error) {
    return (
      <Center bg="black" minH="60dvh">
        <VStack gap={3}>
          <Text color="red.400">{error}</Text>
          <Text color="gray.500" fontSize="sm">
            Попробуйте перезагрузить страницу
          </Text>
        </VStack>
      </Center>
    )
  }

  return (
    <Box
      ref={containerRef}
      position="relative"
      bg="black"
      w="100%"
      h="100dvh"
      overflow="hidden"
      cursor={showControls ? 'default' : 'none'}
      css={{
        '& .libassjs-canvas-parent': {
          zIndex: 2,
          pointerEvents: 'none',
        },
      }}
      onMouseMove={resetHideTimeout}
      onClick={(e) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'VIDEO') {
          togglePlay()
          resetHideTimeout()
        }
      }}
    >
      {/* Скрытый audio для раздельных дорожек */}
      {audioUrl && <audio key={audioUrl} ref={audioRef} src={audioUrl} preload="auto" />}

      {/* SubtitlesOctopus для ASS/SSA */}
      {isAssSubtitle && subtitleUrl && isVideoReady && videoRef.current && (
        <SubtitleOverlayWrapper
          videoRef={videoRef}
          subtitleUrl={subtitleUrl}
          fonts={fontUrls}
          topOffset={showControls ? 60 : 0}
          bottomOffset={showControls ? 80 : 0}
        />
      )}

      <PlayerLoadingOverlay isLoading={isLoading} />

      <AutoplayBlockedOverlay
        isAudioBlocked={isAudioBlocked}
        isVideoBlocked={isVideoBlocked}
        onUnblockAudio={handleUnblockAudio}
        onUnblockAll={handleUnblockAll}
      />

      {/* Горячие клавиши (клавиша ?) */}
      {showShortcuts && <KeyboardShortcutsOverlay onClose={() => setShowShortcuts(false)} />}

      {/* Информация о видео (клавиша I) */}
      <VideoInfo
        visible={showVideoInfo}
        manifest={manifest}
        currentTime={currentTime}
        audioTrackIndex={audioTrackIndex}
        playbackRate={playbackRate}
      />

      {/* Заголовок */}
      <PlayerHeader
        animeSlug={animeSlug}
        animeName={manifest.info.animeName}
        episodeNumber={manifest.info.episodeNumber}
        episodeName={manifest.info.episodeName}
        visible={showControls}
        rightSlot={headerRightSlot}
      />

      {/* Оверлей для закрытия глав */}
      {showChapterList && chapters.length > 0 && (
        <Box
          position="absolute"
          inset={0}
          zIndex={14}
          onClick={(e) => {
            e.stopPropagation()
            closeChapterList()
          }}
        />
      )}

      {/* Панель глав */}
      {showChapterList && chapters.length > 0 && (
        <Box
          position="absolute"
          top="56px"
          right={4}
          bg="bg.panel"
          border="1px solid"
          borderColor="border.muted"
          borderRadius="md"
          p={3}
          minW={{ base: '200px', md: '280px' }}
          maxH={{ base: '300px', md: '400px' }}
          overflowY="auto"
          zIndex={15}
          onClick={(e) => e.stopPropagation()}
          opacity={showControls ? 1 : 0}
          pointerEvents={showControls ? 'auto' : 'none'}
          transition="opacity 0.3s"
        >
          <Text fontSize="xs" color="fg.muted" fontWeight="bold" mb={2}>
            Главы
          </Text>
          <ChapterList
            chapters={chapters}
            currentTime={currentTime}
            duration={duration}
            onSeek={(time: number) => {
              handleChapterSeek(time)
              closeChapterList()
            }}
          />
        </Box>
      )}

      {/* Кнопка пропуска OP/ED */}
      {!autoSkipEnabled && chapters.length > 0 && (
        <ChapterSkipButton chapters={chapters} currentTime={currentTime} onSeek={handleChapterSeek} />
      )}

      {/* Контролы */}
      <SharedPlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        isVisible={showControls}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
        onToggleFullscreen={toggleFullscreen}
        onSkipTime={skipTime}
        chapters={chapterInfos}
        onChapterSeek={handleChapterSeek}
        playbackSpeed={playbackRate}
        onPlaybackSpeedChange={handlePlaybackSpeedChange}
        navigationSlot={navigationSlot}
        spriteUrl={spriteUrl}
        spriteCues={spriteCues}
      />
    </Box>
  )
}

/** Обёртка SubtitleOverlay */
function SubtitleOverlayWrapper({
  videoRef,
  subtitleUrl,
  fonts,
  topOffset,
  bottomOffset,
}: {
  videoRef: RefObject<HTMLVideoElement | null>
  subtitleUrl: string
  fonts: string[]
  topOffset?: number
  bottomOffset?: number
}) {
  return (
    <SubtitleOverlay
      videoRef={videoRef}
      subtitleUrl={subtitleUrl}
      fonts={fonts}
      workerUrl="/libassjs-worker.js"
      fallbackFont="/default.woff2"
      topOffset={topOffset}
      bottomOffset={bottomOffset}
    />
  )
}
