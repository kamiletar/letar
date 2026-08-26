'use client'

/**
 * Полноценный плеер для просмотра аниме из каталога (без импорта в библиотеку)
 *
 * Поддерживает:
 * - Аудиодорожки (выбор озвучки)
 * - Субтитры (ASS с шрифтами, SRT, VTT)
 * - Главы на прогресс-баре (OP/ED/recap маркеры) + ChapterList
 * - Автопропуск OP/ED (с localStorage-персистенцией)
 * - Sprite thumbnails (hover preview)
 * - Навигация prev/next по эпизодам
 * - UpNextOverlay (автопереход к следующему)
 * - ResumeOverlay (продолжить просмотр с сохранённой позиции)
 * - CompletionOverlay (после последнего эпизода)
 * - Переключатель озвучка/оригинал (trackMode)
 *
 * Данные загружаются из IPFS напрямую (EpisodeManifest), не из локальной БД.
 * Прогресс сохраняется в localStorage.
 */

import { Box, Button, Drawer, HStack, IconButton, Spinner, Text, VStack } from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuArrowLeft, LuDownload, LuLanguages, LuList, LuSkipForward } from 'react-icons/lu'

import type { UpNextContent } from '@/components/player'
import {
  ChapterMarkers,
  CompletionOverlay,
  ResumeOverlay,
  TrackSelector,
  UpNextOverlay,
  VideoPlayer,
  type VideoPlayerRef,
} from '@/components/player'
import { Tooltip } from '@/components/ui/tooltip'
import { useFindManyAnime, useFindUniqueSettings } from '@/lib/hooks'
import { toPlayableUrl } from '@/lib/media-url'
import { ChapterList } from '@letar/video-player-react'
import type { TrackerAnimeDetail } from '../../../../../shared/types/tracker'

import { useDiscoverEpisode } from './_hooks/use-discover-episode'
import { useDiscoverProgress } from './_hooks/use-discover-progress'

/** Префикс ключа localStorage для per-anime режима дорожек */
const TRACK_MODE_PREFIX = 'discover-track-mode:'
/** Ключ localStorage для автопропуска */
const AUTOSKIP_KEY = 'discover-autoskip'

/** Страница плеера каталога с Suspense boundary (useSearchParams требует Suspense) */
export default function DiscoverWatchPage() {
  return (
    <Suspense
      fallback={
        <Box h="full" bg="black" display="flex" alignItems="center" justifyContent="center">
          <Spinner size="xl" color="purple.400" />
        </Box>
      }
    >
      <DiscoverWatchContent />
    </Suspense>
  )
}

/** Полноценный плеер для каталога */
function DiscoverWatchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const videoCid = searchParams.get('cid')
  const title = searchParams.get('title') || ''
  const episodeNumber = searchParams.get('ep') || ''
  const animeId = searchParams.get('animeId')

  const playerRef = useRef<VideoPlayerRef>(null)

  // Загружаем данные аниме для навигации между эпизодами
  const [animeDetail, setAnimeDetail] = useState<TrackerAnimeDetail | null>(null)
  useEffect(() => {
    if (!animeId) {
      return
    }
    const load = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tracker preload не типизирован в electron.d.ts
        const ipcResult = await (window.electronAPI as any).tracker.getAnimeDetail(animeId)
        const detailResult = ipcResult?.data ?? ipcResult
        if (detailResult?.success && detailResult.data) {
          setAnimeDetail(detailResult.data)
        }
      } catch {
        // Ошибка загрузки — навигация между эпизодами не будет доступна
      }
    }
    load()
  }, [animeId])

  // Проверяем наличие аниме в локальной библиотеке по shikimoriId
  const shikimoriId = animeDetail?.shikimoriId ? Number(animeDetail.shikimoriId) : null
  const { data: localAnimes } = useFindManyAnime(
    { where: { shikimoriId: shikimoriId ?? undefined }, select: { id: true } },
    { enabled: shikimoriId != null },
  )
  const isInLibrary = (localAnimes?.length ?? 0) > 0

  // Загружаем EpisodeManifest из IPFS через цепочку:
  // directoryCid/manifest.json → episodesCid → episodes[N].manifestCid → EpisodeManifest
  const epNum = episodeNumber ? Number(episodeNumber) : null
  const { data: episodeData, isLoading } = useDiscoverEpisode(animeDetail?.directoryCid, epNum, videoCid)

  // Настройки из БД — для глобального дефолта trackPreference
  const { data: settings } = useFindUniqueSettings({ where: { id: 'default' } })

  // Маппинг Settings.trackPreference → trackMode
  const settingsDefault = useMemo<'dub' | 'sub'>(() => {
    if (settings?.trackPreference === 'ORIGINAL_SUB') {
      return 'sub'
    }
    return 'dub' // RUSSIAN_DUB, AUTO, null → 'dub'
  }, [settings?.trackPreference])

  // Режим дорожек: каскад per-anime localStorage → Settings → 'dub'
  const [trackMode, setTrackMode] = useState<'dub' | 'sub'>(settingsDefault)

  // Когда приходит shikimoriId — проверяем per-anime override в localStorage
  useEffect(() => {
    const shikimoriId = animeDetail?.shikimoriId
    if (!shikimoriId) {
      return
    }
    try {
      const saved = localStorage.getItem(`${TRACK_MODE_PREFIX}${shikimoriId}`) as 'dub' | 'sub' | null
      if (saved) {
        setTrackMode(saved)
      }
    } catch {
      // localStorage недоступен
    }
  }, [animeDetail?.shikimoriId])

  // Обновляем trackMode когда Settings загрузились (если нет per-anime override)
  useEffect(() => {
    const shikimoriId = animeDetail?.shikimoriId
    try {
      if (shikimoriId && localStorage.getItem(`${TRACK_MODE_PREFIX}${shikimoriId}`)) {
        return // есть per-anime override — не перезаписываем
      }
    } catch {
      // localStorage недоступен
    }
    setTrackMode(settingsDefault)
  }, [settingsDefault, animeDetail?.shikimoriId])

  // Состояние выбранных дорожек
  const [selectedAudioTrackId, setSelectedAudioTrackId] = useState<string | null>(null)
  const [selectedSubtitleTrackId, setSelectedSubtitleTrackId] = useState<string | null>(null)

  // Автопропуск OP/ED (из localStorage)
  const [autoSkipEnabled, setAutoSkipEnabled] = useState(() => {
    try {
      return localStorage.getItem(AUTOSKIP_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Состояние для UpNext
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [upNextVisible, setUpNextVisible] = useState(false)
  const [upNextDismissed, setUpNextDismissed] = useState(false)

  // Состояние для CompletionOverlay
  const [isCompletionOpen, setIsCompletionOpen] = useState(false)

  // Состояние для ChapterList (панель глав)
  const [showChapterList, setShowChapterList] = useState(false)

  // Навигация между эпизодами
  const currentEpIndex = useMemo(() => {
    if (!animeDetail?.episodes || !episodeNumber) {
      return -1
    }
    return animeDetail.episodes.findIndex((ep) => String(ep.number) === episodeNumber)
  }, [animeDetail?.episodes, episodeNumber])

  const prevEpisode = currentEpIndex > 0 ? animeDetail!.episodes[currentEpIndex - 1] : null
  const nextEpisode = animeDetail?.episodes && currentEpIndex >= 0 && currentEpIndex < animeDetail.episodes.length - 1
    ? animeDetail.episodes[currentEpIndex + 1]
    : null
  const isLastEpisode = animeDetail?.episodes && currentEpIndex >= 0
    && currentEpIndex === animeDetail.episodes.length - 1

  // Прогресс просмотра (БД)
  const discoverProgress = useDiscoverProgress({
    shikimoriId: animeDetail?.shikimoriId,
    episodeNumber: epNum,
    meta: {
      animeName: title || animeDetail?.title || '',
      posterCid: animeDetail?.coverUrl ?? null,
      trackerAnimeId: animeId ?? null,
      directoryCid: animeDetail?.directoryCid ?? null,
    },
  })

  // Текущий аудио трек ID — учитываем trackMode
  const currentAudioId = useMemo(() => {
    if (selectedAudioTrackId) {
      return selectedAudioTrackId
    }
    const tracks = episodeData?.audioTracksForPlayer ?? []
    if (trackMode === 'dub') {
      // Озвучка: русская → default → первая
      const russian = tracks.find((t) => t.language === 'ru' || t.language === 'rus')
      if (russian) {
        return russian.id
      }
    } else {
      // Оригинал: японская → default → первая
      const japanese = tracks.find((t) => t.language === 'ja' || t.language === 'jpn')
      if (japanese) {
        return japanese.id
      }
    }
    const defaultTrack = tracks.find((t) => t.isDefault)
    if (defaultTrack) {
      return defaultTrack.id
    }
    return tracks[0]?.id ?? null
  }, [selectedAudioTrackId, episodeData?.audioTracksForPlayer, trackMode])

  // Текущий субтитр (объект ManifestSubtitleTrack) — учитываем trackMode
  const currentSubtitleTrack = useMemo(() => {
    if (!episodeData?.subtitleTracks) {
      return null
    }
    if (selectedSubtitleTrackId) {
      return episodeData.subtitleTracks.find((t) => t.id === selectedSubtitleTrackId) ?? null
    }

    if (trackMode === 'dub') {
      // Озвучка — ищем субтитры-надписи (signs)
      const signs = episodeData.subtitleTracks.find(
        (t) => t.title?.toLowerCase().includes('sign') || t.title?.toLowerCase().includes('надпис'),
      )
      return signs ?? null
    }
    // Оригинал — русские субтитры
    const rusSub = episodeData.subtitleTracks.find((t) => t.language === 'ru' || t.language === 'rus')
    if (rusSub) {
      return rusSub
    }
    const defaultSub = episodeData.subtitleTracks.find((t) => t.isDefault)
    return defaultSub ?? episodeData.subtitleTracks[0] ?? null
  }, [selectedSubtitleTrackId, episodeData, trackMode])

  // URL и формат субтитров
  const subtitlePath = useMemo(() => {
    if (!currentSubtitleTrack?.cid) {
      return null
    }
    return toPlayableUrl({ cid: currentSubtitleTrack.cid })
  }, [currentSubtitleTrack])

  const subtitleFormat = currentSubtitleTrack?.format as 'ass' | 'ssa' | 'srt' | 'vtt' | null | undefined

  // URL шрифтов для ASS субтитров
  const subtitleFonts = useMemo(() => {
    if (!currentSubtitleTrack?.fonts) {
      return []
    }
    return currentSubtitleTrack.fonts
      .map((f) => (f.cid ? toPlayableUrl({ cid: f.cid }) : null))
      .filter((url): url is string => url !== null)
  }, [currentSubtitleTrack?.fonts])

  /** Перейти к конкретному эпизоду */
  const navigateToEpisode = useCallback(
    (episode: TrackerAnimeDetail['episodes'][number]) => {
      const params = new URLSearchParams({
        cid: episode.videoCid,
        title,
        ep: String(episode.number),
      })
      if (animeId) {
        params.set('animeId', animeId)
      }
      // Сброс состояния при навигации
      setSelectedAudioTrackId(null)
      setSelectedSubtitleTrackId(null)
      setUpNextVisible(false)
      setUpNextDismissed(false)
      setCurrentTime(0)
      setDuration(0)
      setIsCompletionOpen(false)
      router.push(`/discover/watch?${params.toString()}`)
    },
    [title, animeId],
  )

  const goToPrevEpisode = useCallback(() => {
    if (prevEpisode) {
      navigateToEpisode(prevEpisode)
    }
  }, [prevEpisode, navigateToEpisode])

  const goToNextEpisode = useCallback(() => {
    if (nextEpisode) {
      navigateToEpisode(nextEpisode)
    }
  }, [nextEpisode, navigateToEpisode])

  // UpNext контент
  const upNextContent = useMemo<UpNextContent | null>(() => {
    if (!nextEpisode) {
      return null
    }
    return {
      type: 'episode',
      title: nextEpisode.title || `Эпизод ${nextEpisode.number}`,
      subtitle: `${nextEpisode.number}`,
      episodeId: nextEpisode.id,
    }
  }, [nextEpisode])

  // Автопропуск OP/ED
  const autoSkipRef = useRef(autoSkipEnabled)
  autoSkipRef.current = autoSkipEnabled
  const lastSkipRef = useRef<string | null>(null)

  // Сохранение autoSkip в localStorage
  const toggleAutoSkip = useCallback(() => {
    setAutoSkipEnabled((v) => {
      const newVal = !v
      try {
        localStorage.setItem(AUTOSKIP_KEY, String(newVal))
      } catch {
        // Ошибки localStorage не критичны
      }
      return newVal
    })
  }, [])

  // Переключение trackMode — сохраняем per-anime override в localStorage
  const toggleTrackMode = useCallback(() => {
    setTrackMode((prev) => {
      const next = prev === 'dub' ? 'sub' : 'dub'
      const shikimoriId = animeDetail?.shikimoriId
      if (shikimoriId) {
        try {
          localStorage.setItem(`${TRACK_MODE_PREFIX}${shikimoriId}`, next)
        } catch {
          // localStorage недоступен
        }
      }
      // Сбрасываем ручной выбор дорожек
      setSelectedAudioTrackId(null)
      setSelectedSubtitleTrackId(null)
      return next
    })
  }, [animeDetail?.shikimoriId])

  /** Обработчик обновления времени */
  const handleTimeUpdate = useCallback(
    (time: number, dur: number) => {
      setCurrentTime(time)
      setDuration(dur)

      // Сохраняем прогресс в БД
      discoverProgress.saveProgress(time, dur, selectedAudioTrackId, selectedSubtitleTrackId)

      // Автопропуск OP/ED
      if (autoSkipRef.current && episodeData?.chapters) {
        for (const ch of episodeData.chapters) {
          const type = ch.type
          if (
            (type === 'OP' || type === 'ED' || type === 'RECAP' || type === 'PREVIEW')
            && time >= ch.startTime
            && time < ch.endTime - 0.5
          ) {
            const skipKey = `${ch.id}-${ch.startTime}`
            if (lastSkipRef.current !== skipKey) {
              lastSkipRef.current = skipKey
              playerRef.current?.seek(ch.endTime)
            }
            break
          }
        }
      }

      // UpNext — показать за 30 секунд до конца
      if (upNextContent && !upNextDismissed && dur > 0) {
        const remaining = dur - time
        if (remaining <= 30 && remaining > 0 && !upNextVisible) {
          setUpNextVisible(true)
        }
        if (remaining > 35 && upNextVisible) {
          setUpNextVisible(false)
        }
      }
    },
    [
      episodeData?.chapters,
      upNextContent,
      upNextDismissed,
      upNextVisible,
      discoverProgress,
      selectedAudioTrackId,
      selectedSubtitleTrackId,
    ],
  )

  /** Обработчик окончания видео */
  const handleEnded = useCallback(() => {
    if (isLastEpisode) {
      // Последний эпизод — показать CompletionOverlay
      setIsCompletionOpen(true)
    } else if (nextEpisode) {
      navigateToEpisode(nextEpisode)
    }
  }, [nextEpisode, navigateToEpisode, isLastEpisode])

  /** Обработчик seek по главе */
  const handleChapterSeek = useCallback((time: number) => {
    playerRef.current?.seek(time)
  }, [])

  /** Вернуться на страницу деталей или каталог */
  const handleBack = () => {
    if (animeId) {
      router.push(`/discover/${animeId}`)
    } else {
      router.push('/discover')
    }
  }

  /** Импортировать аниме */
  const handleImport = async () => {
    if (animeId) {
      router.push(`/discover/${animeId}`)
    }
  }

  /** Обработчик ResumeOverlay — продолжить с сохранённой позиции */
  const handleResume = useCallback(() => {
    discoverProgress.handleResume()
    if (discoverProgress.savedResumeTime > 0) {
      playerRef.current?.seek(discoverProgress.savedResumeTime)
    }
  }, [discoverProgress])

  // Сброс lastSkipRef при смене эпизода
  useEffect(() => {
    lastSkipRef.current = null
  }, [animeDetail?.directoryCid, episodeNumber, videoCid])

  // Название текущего эпизода для headerCenter
  const currentEpisodeTitle = useMemo(() => {
    if (!animeDetail?.episodes || currentEpIndex < 0) {
      return null
    }
    return animeDetail.episodes[currentEpIndex]?.title || null
  }, [animeDetail?.episodes, currentEpIndex])

  // Загрузка
  if (isLoading) {
    return (
      <Box h="full" bg="black" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="xl" color="purple.400" />
          <Text color="whiteAlpha.700">Загрузка...</Text>
        </VStack>
      </Box>
    )
  }

  // Нет данных
  if (!episodeData?.videoSrc) {
    return (
      <Box h="full" display="flex" alignItems="center" justifyContent="center" flexDir="column" gap={4}>
        <Text color="red.500">Нет видео для воспроизведения</Text>
        <Button onClick={() => router.push('/discover')} variant="outline">
          <LuArrowLeft size={16} style={{ marginRight: 8 }} />
          Каталог
        </Button>
      </Box>
    )
  }

  return (
    <Box h="full" display="flex" flexDir="column" bg="black" overflow="hidden">
      <Box flex={1} minH={0} position="relative" overflow="hidden">
        <VideoPlayer
          ref={playerRef}
          src={episodeData.videoSrc}
          autoPlay={!discoverProgress.showResumeOverlay}
          showControls
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={(err) => console.error('[DiscoverWatch] Video error:', err)}
          audioTracks={episodeData.audioTracksForPlayer}
          currentAudioTrackId={currentAudioId || undefined}
          onAudioTrackChange={(id) => setSelectedAudioTrackId(String(id))}
          subtitlePath={subtitlePath}
          subtitleFormat={subtitleFormat}
          subtitleFonts={subtitleFonts}
          chapters={episodeData.chapters.map((c) => ({
            id: c.id,
            title: c.title,
            startTime: c.startTime,
          }))}
          onChapterSeek={handleChapterSeek}
          spriteUrl={episodeData.spriteUrl ?? undefined}
          spriteCues={episodeData.spriteCues}
          hasPrevEpisode={!!prevEpisode}
          hasNextEpisode={!!nextEpisode}
          onPrevEpisode={goToPrevEpisode}
          onNextEpisode={goToNextEpisode}
          prevEpisodeTooltip={prevEpisode
            ? `Эпизод ${prevEpisode.number}${prevEpisode.title ? `: ${prevEpisode.title}` : ''}`
            : 'Это первый эпизод'}
          nextEpisodeTooltip={nextEpisode
            ? `Эпизод ${nextEpisode.number}${nextEpisode.title ? `: ${nextEpisode.title}` : ''}`
            : 'Это последний эпизод'}
          headerLeft={
            <HStack gap={2}>
              <Button onClick={handleBack} variant="ghost" size="sm" color="white" _hover={{ bg: 'whiteAlpha.200' }}>
                <LuArrowLeft size={16} style={{ marginRight: 4 }} />
                {title || 'Назад'}
              </Button>
            </HStack>
          }
          headerCenter={
            <VStack gap={0} align="center">
              <Text fontSize="sm" fontWeight="medium" color="white">
                Эпизод {episodeNumber}
              </Text>
              {currentEpisodeTitle && (
                <Text fontSize="xs" color="whiteAlpha.700">
                  {currentEpisodeTitle}
                </Text>
              )}
            </VStack>
          }
          headerRight={
            <HStack gap={2}>
              {/* Переключатель озвучка/оригинал */}
              <Tooltip content={trackMode === 'dub' ? 'Режим: Озвучка + надписи' : 'Режим: Оригинал + субтитры'}>
                <IconButton
                  aria-label="Режим дорожек"
                  variant={trackMode === 'sub' ? 'solid' : 'ghost'}
                  colorPalette={trackMode === 'sub' ? 'purple' : 'whiteAlpha'}
                  size="sm"
                  onClick={toggleTrackMode}
                >
                  <LuLanguages size={20} />
                </IconButton>
              </Tooltip>
              {/* Автопропуск OP/ED */}
              {episodeData.chapters.some((c) => c.type === 'OP' || c.type === 'ED') && (
                <Tooltip content={autoSkipEnabled ? 'Автопропуск включён' : 'Автопропуск выключен'}>
                  <IconButton
                    aria-label="Автопропуск"
                    variant={autoSkipEnabled ? 'solid' : 'ghost'}
                    colorPalette={autoSkipEnabled ? 'purple' : 'whiteAlpha'}
                    size="sm"
                    onClick={toggleAutoSkip}
                  >
                    <LuSkipForward size={20} />
                  </IconButton>
                </Tooltip>
              )}
              {/* Список глав */}
              {episodeData.chapters.length > 0 && (
                <Tooltip content="Список глав">
                  <IconButton
                    aria-label="Список глав"
                    variant="ghost"
                    colorPalette="whiteAlpha"
                    size="sm"
                    onClick={() => setShowChapterList((v) => !v)}
                  >
                    <LuList size={20} />
                  </IconButton>
                </Tooltip>
              )}
              {/* TrackSelector */}
              {(episodeData.audioTracksForSelector.length > 0 || episodeData.subtitleTracksForSelector.length > 0) && (
                <TrackSelector
                  audioTracks={episodeData.audioTracksForSelector}
                  subtitleTracks={episodeData.subtitleTracksForSelector}
                  selectedAudioTrack={currentAudioId || undefined}
                  selectedSubtitleTrack={selectedSubtitleTrackId}
                  onAudioTrackChange={(id) => setSelectedAudioTrackId(String(id))}
                  onSubtitleTrackChange={(id) => setSelectedSubtitleTrackId(id ? String(id) : null)}
                />
              )}
              {/* Импорт — только если аниме ещё нет в библиотеке */}
              {animeId && !isInLibrary && (
                <Button
                  onClick={handleImport}
                  variant="ghost"
                  size="sm"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200' }}
                >
                  <LuDownload size={16} style={{ marginRight: 4 }} />
                  Импорт
                </Button>
              )}
            </HStack>
          }
        />

        {/* ResumeOverlay — предложение продолжить просмотр */}
        <ResumeOverlay
          savedTime={discoverProgress.savedResumeTime}
          onResume={handleResume}
          onStartOver={discoverProgress.handleStartOver}
          isOpen={discoverProgress.showResumeOverlay}
        />

        {/* Маркеры глав (кнопка пропуска) */}
        {episodeData.chapters.length > 0 && (
          <ChapterMarkers
            chapters={episodeData.chapters}
            duration={duration || episodeData.durationSec}
            currentTime={currentTime}
            onSeek={handleChapterSeek}
            showSkipButton
          />
        )}

        {/* UpNext оверлей */}
        <UpNextOverlay
          next={upNextContent}
          isVisible={upNextVisible}
          autoPlayEnabled
          onPlayNow={() => {
            setUpNextVisible(false)
            if (nextEpisode) {
              navigateToEpisode(nextEpisode)
            }
          }}
          onCancel={() => {
            setUpNextVisible(false)
            setUpNextDismissed(true)
          }}
        />

        {/* CompletionOverlay — после последнего эпизода */}
        <CompletionOverlay
          isOpen={isCompletionOpen}
          anime={{
            id: animeId ?? '',
            name: title || animeDetail?.title || '',
            episodeCount: animeDetail?.episodes?.length ?? 1,
          }}
          onClose={() => setIsCompletionOpen(false)}
          loadSuggestion={false}
          backUrl={animeId ? `/discover/${animeId}` : '/discover'}
          backLabel="К аниме"
        />

        {/* ChapterList — боковая панель со списком глав */}
        <Drawer.Root open={showChapterList} onOpenChange={(e) => setShowChapterList(e.open)} placement="end" size="sm">
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bg="bg.panel">
              <Drawer.Header>
                <Drawer.Title>Главы</Drawer.Title>
                <Drawer.CloseTrigger />
              </Drawer.Header>
              <Drawer.Body>
                <ChapterList
                  chapters={episodeData.chapters}
                  currentTime={currentTime}
                  duration={duration || episodeData.durationSec}
                  onSeek={(time) => {
                    handleChapterSeek(time)
                    setShowChapterList(false)
                  }}
                />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Root>
      </Box>
    </Box>
  )
}
