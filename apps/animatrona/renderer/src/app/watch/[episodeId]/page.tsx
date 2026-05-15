'use client'

/**
 * Страница просмотра эпизода
 * Загружает эпизод с аудио/субтитрами и подключает плеер
 * Сохраняет прогресс просмотра и выбранные дорожки
 * Поддерживает редактирование глав и автопропуск
 */

import { Box, Button, HStack, Icon, IconButton, Spinner, Text, VStack } from '@chakra-ui/react'
import { use, useCallback, useEffect, useRef, useState } from 'react'
import { LuArrowLeft, LuLanguages, LuList, LuSkipForward } from 'react-icons/lu'

import { useGlobalVideoStore } from '@/components/global-video'
import {
  ChapterEditor,
  ChapterMarkers,
  CompletionOverlay,
  ResumeOverlay,
  TrackEditDialog,
  TrackSelector,
  UpNextOverlay,
  VideoPlayer,
  type VideoPlayerRef,
} from '@/components/player'
import { Tooltip } from '@/components/ui/tooltip'
import { useFindUniqueEpisode, useFindUniqueSettings } from '@/lib/hooks'
import { useSpriteThumbnails } from '@/lib/hooks/use-sprite-thumbnails'
import { getAudioUrl, getSubtitleUrl, getVideoUrl, toPlayableUrl } from '@/lib/media-url'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  type EpisodeWithTracks,
  useChapterAutoSkip,
  useChapterEditor,
  useEpisodeNavigation,
  useGlobalVideo,
  usePlayerTracks,
  useUpNext,
  useWatchProgress,
} from '../_hooks'

// Отключаем статическую генерацию
export const dynamic = 'force-dynamic'

interface WatchPageProps {
  params: Promise<{ episodeId: string }>
}

/**
 * Страница просмотра эпизода
 */
export default function WatchPage({ params }: WatchPageProps) {
  const { episodeId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoResume = searchParams.get('autoResume') === 'true'
  const playerRef = useRef<VideoPlayerRef>(null)

  // Предпочтение дорожек: null = используем из настроек, иначе — локальный выбор сессии
  const [sessionPreference, setSessionPreference] = useState<'RUSSIAN_DUB' | 'ORIGINAL_SUB' | null>(null)

  // Загружаем настройки для получения trackPreference по умолчанию
  const { data: settings } = useFindUniqueSettings({ where: { id: 'default' } })

  // Загружаем эпизод с дорожками
  // Episode включает все базовые поля (включая manifestCid) автоматически
  const { data, isLoading, error } = useFindUniqueEpisode({
    where: { id: episodeId },
    include: {
      audioTracks: {
        orderBy: { streamIndex: 'asc' },
      },
      subtitleTracks: {
        orderBy: { streamIndex: 'asc' },
        include: { fonts: true },
      },
      anime: {
        select: {
          id: true,
          name: true,
          originalName: true,
          year: true,
          folderPath: true,
          shikimoriId: true,
          watchStatus: true,
          userRating: true,
          isBdRemux: true,
          lastSelectedAudioDubGroup: true,
          lastSelectedSubtitleDubGroup: true,
          lastSelectedAudioLanguage: true,
          lastSelectedSubtitleLanguage: true,
          poster: { select: { cid: true } },
        },
      },
      season: {
        select: { id: true, number: true },
      },
    },
  })

  const episode = data as EpisodeWithTracks | null | undefined

  // Определяем путь к видео — только через IPFS CID (библиотека = IPFS-only)
  // sourcePath больше не используется как fallback для воспроизведения
  const videoSrc = episode?.transcodedCid ? getVideoUrl({ transcodedCid: episode.transcodedCid }) : null

  // Хук для интеграции с глобальным видео (mini-player)
  const globalVideo = useGlobalVideo({
    playerRef,
    episodeId,
    episode: episode ?? null,
    videoSrc,
  })

  // Эффективное предпочтение: сессионный выбор → настройки → AUTO
  const effectivePreference = sessionPreference ?? settings?.trackPreference ?? 'AUTO'

  // Хук для управления дорожками
  const tracks = usePlayerTracks({
    playerRef,
    episode,
    trackPreference: effectivePreference,
  })

  // Синхронизируем URL аудиодорожки в global store (для MiniPlayer)
  const currentAudioTrackForMini = episode?.audioTracks.find((t) => t.id === tracks.currentAudioId)
  const audioSrcForMini = currentAudioTrackForMini?.transcodedCid ? getAudioUrl(currentAudioTrackForMini) : null
  useEffect(() => {
    useGlobalVideoStore.getState().setAudioSrc(audioSrcForMini)
  }, [audioSrcForMini])

  // Хук для управления прогрессом
  const progress = useWatchProgress({
    playerRef,
    episode,
    episodeId,
    selectedAudioTrackId: tracks.selectedAudioTrackId,
    selectedSubtitleTrackId: tracks.selectedSubtitleTrackId,
    onSetSelectedAudioTrackId: tracks.setSelectedAudioTrackId,
    onSetSelectedSubtitleTrackId: tracks.setSelectedSubtitleTrackId,
  })

  // Хук для редактора глав (главы из IPFS манифеста)
  const chapterEditor = useChapterEditor({
    playerRef,
    episodeId,
    manifestCid: episode?.manifestCid,
    durationMs: episode?.durationMs ?? 0,
  })

  // Хук для sprite thumbnails (hover preview на таймлайне)
  const spriteThumbnails = useSpriteThumbnails(episode?.manifestCid)

  // Хук для автопропуска глав
  const autoSkip = useChapterAutoSkip({
    playerRef,
    chapters: chapterEditor.playerChapters,
    currentPlaybackTime: chapterEditor.currentPlaybackTime,
    episodeId,
  })

  // Callback для показа экрана завершения
  const handleShowCompletion = useCallback(() => {
    setIsCompletionOpen(true)
  }, [])

  // Хук для навигации между эпизодами
  const navigation = useEpisodeNavigation({
    playerRef,
    episode,
    saveProgress: progress.saveProgress,
    onShowCompletion: handleShowCompletion,
  })

  // Состояние для UpNext (время и длительность)
  const [currentTimeForUpNext, setCurrentTimeForUpNext] = useState(0)
  const [durationForUpNext, setDurationForUpNext] = useState(0)

  // Состояние для CompletionOverlay
  const [isCompletionOpen, setIsCompletionOpen] = useState(false)

  // Хук для оверлея "Следующий эпизод"
  const upNext = useUpNext({
    playerRef,
    episode,
    navigation,
    currentTime: currentTimeForUpNext,
    duration: durationForUpNext,
  })

  // Объединённый обработчик времени для прогресса, редактора глав, UpNext и global video
  const handleTimeUpdate = useCallback(
    (time: number, duration: number) => {
      chapterEditor.updatePlaybackTime(time, duration)
      progress.handleTimeUpdate(time, duration)
      // Обновляем состояние для UpNext оверлея
      setCurrentTimeForUpNext(time)
      setDurationForUpNext(duration)
      // Синхронизируем с global video store для mini-player
      globalVideo.handleGlobalTimeUpdate(time, duration)
    },
    [chapterEditor, progress, globalVideo]
  )

  // Обработчик ошибки видео
  const handleVideoError = useCallback((err: Error) => {
    console.error('[WatchPage] Video error:', err)
  }, [])

  // Загрузка
  if (isLoading) {
    return (
      <Box minH="100vh" bg="black" color="fg" display="flex" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="xl" color="purple.400" />
          <Text color="fg.muted">Загрузка эпизода...</Text>
        </VStack>
      </Box>
    )
  }

  // Ошибка или не найден
  if (error || !episode) {
    return (
      <Box minH="100vh" bg="bg" color="fg" p={6}>
        <VStack gap={4} align="start">
          <Button variant="ghost" size="sm" onClick={() => router.push('/library')}>
            <Icon as={LuArrowLeft} mr={2} />
            Назад в библиотеку
          </Button>
          <Text color="red.400">{error ? 'Ошибка загрузки' : 'Эпизод не найден'}</Text>
        </VStack>
      </Box>
    )
  }

  // Нет видео — контент недоступен
  if (!videoSrc) {
    return (
      <Box minH="100vh" bg="bg" color="fg" p={6}>
        <VStack gap={4} align="start">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/library/${episode.animeId}`)}>
            <Icon as={LuArrowLeft} mr={2} />
            Назад к аниме
          </Button>
          <Text color="yellow.400">Контент недоступен</Text>
          <Text color="fg.subtle" fontSize="sm">
            Видео этого эпизода не найдено в IPFS. Попробуйте переимпортировать эпизод.
          </Text>
        </VStack>
      </Box>
    )
  }

  return (
    <Box h="full" bg="black" color="fg" display="flex" flexDirection="column" overflow="hidden">
      {/* Видеоплеер */}
      <Box flex={1} minH={0}>
        <VideoPlayer
          ref={playerRef}
          src={videoSrc}
          autoPlay={globalVideo.isResuming || autoResume || !progress.showResumeOverlay}
          startTime={globalVideo.resumeTime ?? progress.initialTime}
          showControls
          onTimeUpdate={handleTimeUpdate}
          onPlayStateChange={globalVideo.handleGlobalPlayStateChange}
          onEnded={navigation.handleEnded}
          onError={handleVideoError}
          audioTracks={tracks.audioTracksForPlayer}
          currentAudioTrackId={tracks.currentAudioId || undefined}
          onAudioTrackChange={tracks.handleAudioTrackChange}
          subtitlePath={tracks.currentSubtitleTrack ? getSubtitleUrl(tracks.currentSubtitleTrack) : null}
          subtitleFormat={tracks.currentSubtitleTrack?.format as 'ass' | 'ssa' | 'srt' | 'vtt' | null | undefined}
          subtitleFonts={tracks.currentSubtitleFonts}
          chapters={chapterEditor.playerChapters.map((c) => ({ id: c.id, title: c.title, startTime: c.startTime }))}
          onChapterSeek={chapterEditor.handleSeek}
          spriteUrl={spriteThumbnails.data?.spriteUrl}
          spriteCues={spriteThumbnails.data?.cues}
          hasPrevEpisode={navigation.hasPrevEpisode}
          hasNextEpisode={navigation.hasNextEpisode}
          onPrevEpisode={navigation.goToPrevEpisode}
          onNextEpisode={navigation.goToNextEpisode}
          prevEpisodeTooltip={navigation.prevEpisodeTooltip}
          nextEpisodeTooltip={navigation.nextEpisodeTooltip}
          headerLeft={
            <HStack gap={2}>
              <Button
                variant="ghost"
                size="sm"
                colorPalette="whiteAlpha"
                onClick={() => router.push(`/library/${episode.animeId}`)}
              >
                <Icon as={LuArrowLeft} mr={2} />
                {episode.anime.name}
              </Button>
            </HStack>
          }
          headerCenter={
            <VStack gap={0} align="center">
              <Text fontSize="sm" fontWeight="medium">
                {episode.season ? `Сезон ${episode.season.number}, ` : ''}
                Эпизод {episode.number}
              </Text>
              {episode.name && (
                <Text fontSize="xs" color="fg.muted">
                  {episode.name}
                </Text>
              )}
            </VStack>
          }
          headerRight={
            <HStack gap={2}>
              {/* Кнопка переключения режима: озвучка ↔ оригинал */}
              <Tooltip
                content={
                  effectivePreference === 'RUSSIAN_DUB' ? 'Режим: Озвучка + надписи' : 'Режим: Оригинал + субтитры'
                }
              >
                <IconButton
                  aria-label="Режим дорожек"
                  variant={effectivePreference === 'ORIGINAL_SUB' ? 'solid' : 'ghost'}
                  colorPalette={effectivePreference === 'ORIGINAL_SUB' ? 'purple' : 'whiteAlpha'}
                  size="sm"
                  onClick={() => {
                    const newPref = effectivePreference === 'RUSSIAN_DUB' ? 'ORIGINAL_SUB' : 'RUSSIAN_DUB'
                    setSessionPreference(newPref)
                    // Сбрасываем ручной выбор, чтобы авто-выбор применился с новым preference
                    tracks.setSelectedAudioTrackId(null)
                    tracks.setSelectedSubtitleTrackId(null)
                  }}
                >
                  <Icon as={LuLanguages} />
                </IconButton>
              </Tooltip>
              <Tooltip
                content={
                  autoSkip.autoSkipEnabled
                    ? 'Пропускать всё (OP/ED/Recap/Preview)'
                    : autoSkip.settings?.skipOpening || autoSkip.settings?.skipEnding
                      ? `Пропускать: ${[autoSkip.settings?.skipOpening && 'OP', autoSkip.settings?.skipEnding && 'ED']
                          .filter(Boolean)
                          .join(', ')}`
                      : 'Автопропуск выключен'
                }
              >
                <IconButton
                  aria-label="Автопропуск"
                  variant={autoSkip.autoSkipEnabled ? 'solid' : 'ghost'}
                  colorPalette={autoSkip.autoSkipEnabled ? 'purple' : 'whiteAlpha'}
                  size="sm"
                  onClick={autoSkip.toggleAutoSkip}
                >
                  <Icon as={LuSkipForward} />
                </IconButton>
              </Tooltip>
              <Tooltip content="Редактор глав">
                <IconButton
                  aria-label="Редактор глав"
                  variant="ghost"
                  colorPalette="whiteAlpha"
                  size="sm"
                  onClick={chapterEditor.toggleChapterEditor}
                >
                  <Icon as={LuList} />
                </IconButton>
              </Tooltip>
              <TrackSelector
                audioTracks={tracks.audioTracksForSelector}
                subtitleTracks={tracks.subtitleTracksForSelector}
                selectedAudioTrack={tracks.currentAudioId || undefined}
                selectedSubtitleTrack={tracks.selectedSubtitleTrackId}
                onAudioTrackChange={tracks.handleAudioTrackChange}
                onSubtitleTrackChange={tracks.handleSubtitleTrackChange}
                onEditAudioTrack={tracks.handleEditAudioTrack}
                onDeleteAudioTrack={tracks.handleEditAudioTrack}
                onEditSubtitleTrack={tracks.handleEditSubtitleTrack}
                onDeleteSubtitleTrack={tracks.handleEditSubtitleTrack}
              />
            </HStack>
          }
        />

        {/* Overlay выбора — продолжить или сначала (не показываем при возврате из MiniPlayer) */}
        <ResumeOverlay
          savedTime={progress.savedResumeTime}
          onResume={progress.handleResumeFromSaved}
          onStartOver={progress.handleStartFromBeginning}
          isOpen={!globalVideo.isResuming && !autoResume && progress.showResumeOverlay}
        />

        {/* Маркеры глав (кнопка пропуска) */}
        <ChapterMarkers
          chapters={chapterEditor.playerChapters}
          duration={chapterEditor.videoDuration}
          currentTime={chapterEditor.currentPlaybackTime}
          onSeek={chapterEditor.handleSeek}
          showSkipButton
        />

        {/* Редактор глав */}
        <ChapterEditor
          chapters={chapterEditor.playerChapters}
          duration={chapterEditor.videoDuration}
          currentTime={chapterEditor.currentPlaybackTime}
          onChaptersChange={chapterEditor.handleChaptersChange}
          onSeek={chapterEditor.handleSeek}
          isOpen={chapterEditor.isChapterEditorOpen}
          onClose={chapterEditor.closeChapterEditor}
          currentEpisodeId={episodeId}
          allEpisodes={navigation.allEpisodes as { id: string; number: number; name?: string | null }[] | undefined}
          onCopyToEpisodes={chapterEditor.handleCopyToEpisodes}
          isCopying={chapterEditor.isCopying}
          onGenerateRecapPreview={chapterEditor.handleGenerateRecapPreview}
          isGenerating={chapterEditor.isGenerating}
        />

        {/* Оверлей "Следующий эпизод" (за 30 сек до конца) */}
        <UpNextOverlay
          next={upNext.nextContent}
          isVisible={upNext.isVisible}
          autoPlayEnabled={upNext.autoPlayEnabled}
          onPlayNow={upNext.handlePlayNow}
          onCancel={upNext.handleCancel}
        />

        {/* Экран завершения аниме (после последнего эпизода) */}
        <CompletionOverlay
          isOpen={isCompletionOpen}
          anime={{
            id: episode.animeId,
            name: episode.anime.name,
            posterPath: toPlayableUrl({ cid: episode.anime.poster?.cid }) ?? null,
            episodeCount: navigation.allEpisodes?.length ?? 1,
          }}
          onClose={() => setIsCompletionOpen(false)}
        />
      </Box>

      {/* Диалог редактирования дорожки */}
      <TrackEditDialog
        isOpen={!!tracks.editingTrack}
        trackType={tracks.editingTrack?.type || 'audio'}
        trackId={tracks.editingTrack?.id || null}
        currentTitle={tracks.editingTrack?.title}
        currentLanguage={tracks.editingTrack?.language}
        onSave={tracks.handleSaveTrack}
        onDelete={tracks.handleDeleteTrack}
        onClose={tracks.closeTrackEditor}
      />
    </Box>
  )
}
