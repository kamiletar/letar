'use client'

import { Box, Button, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import nextDynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { use, useCallback, useMemo, useState } from 'react'
import { LuArrowLeft, LuExternalLink } from 'react-icons/lu'

import { syncAnimeRelations } from '@/app/_actions/anime-relation.action'
import { updateAnime } from '@/app/_actions/anime.action'
import { upsertFile } from '@/app/_actions/file.action'
import { syncFranchiseFromGraph } from '@/app/_actions/franchise.action'
import { saveGenresAndThemes, type ShikimoriGenreInput } from '@/app/_actions/genre.action'
import { Header } from '@/components/layout'
import { EpisodeNameEditor, VideoSection } from '@/components/library'
import {
  AboutTab,
  AnimeDetailTabs,
  AnimeHero,
  EpisodesTab,
  FranchiseTab,
  ImportErrorsSection,
  RelatedTab,
  TracksTab,
} from '@/components/library/anime-detail'
import { toaster } from '@/components/ui/toaster'
import type {
  Anime,
  AudioTrack,
  Episode,
  File,
  Genre,
  GenreOnAnime,
  RelationKind,
  Season,
  SubtitleFont,
  SubtitleTrack,
  Theme,
  ThemeOnAnime,
  WatchProgress,
  WatchStatus,
} from '@/generated/prisma'
import { useFindUniqueAnime, useFindUniqueSettings, useUpdateAnime } from '@/lib/hooks'
import { useAnimeInfo, useAnimeManifest } from '@/lib/hooks/index'
import { uploadToIpfs } from '@/lib/ipfs-upload'
import { toPlayableUrl } from '@/lib/media-url'
import type { ManifestChapter } from '@/types/electron'

// Dynamic imports для диалогов — загружаются только при открытии
const ImportWizardDialog = nextDynamic(
  () => import('@/components/import/ImportWizardDialog').then((mod) => mod.ImportWizardDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)
const EditAnimeDialog = nextDynamic(
  () => import('@/components/library/EditAnimeDialog').then((mod) => mod.EditAnimeDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)
const DeleteAnimeDialog = nextDynamic(
  () => import('@/components/library/DeleteAnimeDialog').then((mod) => mod.DeleteAnimeDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)
const ExportSeriesDialog = nextDynamic(
  () => import('@/components/library/ExportSeriesDialog').then((mod) => mod.ExportSeriesDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)
const AddTracksWizardDialog = nextDynamic(
  () => import('@/components/add-tracks/AddTracksWizardDialog').then((mod) => mod.AddTracksWizardDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)
const RestoreTracksDialog = nextDynamic(
  () => import('@/components/restore-tracks/RestoreTracksDialog').then((mod) => mod.RestoreTracksDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)
const ReencodeAudioDialog = nextDynamic(
  () => import('@/components/library/reencode').then((mod) => mod.ReencodeAudioDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)
/** Тип SubtitleTrack с шрифтами */
type SubtitleTrackWithFonts = SubtitleTrack & {
  fonts: SubtitleFont[]
}

/** Тип Episode с дополнительными полями */
type EpisodeWithDetails = Episode & {
  audioTracks: AudioTrack[]
  subtitleTracks: SubtitleTrackWithFonts[]
  season: Season
}

/** Тип Anime с включёнными связями */
type AnimeWithRelations = Anime & {
  genres: (GenreOnAnime & { genre: Genre })[]
  themes: (ThemeOnAnime & { theme: Theme })[]
  episodes: EpisodeWithDetails[]
  seasons: Season[]
  watchProgress: WatchProgress[]
  poster: File | null
}

// Отключаем статическую генерацию
export const dynamic = 'force-dynamic'

interface AnimePageProps {
  params: Promise<{ id: string }>
}

/**
 * Bisect шаг 2: Все импорты + хуки + state + callbacks + рендер компонентов
 * БЕЗ диалогов (dynamic imports)
 */
export default function AnimePage({ params }: AnimePageProps) {
  const { id } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // Синхронизация вкладок с URL (?tab=about, ?tab=tracks и т.д.)
  const currentTab = searchParams.get('tab') || 'episodes'
  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      // Дефолтный таб не записываем в URL для чистоты
      if (value === 'episodes') {
        params.delete('tab')
      } else {
        params.set('tab', value)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [searchParams, pathname, router]
  )
  const updateAnimeMutation = useUpdateAnime()
  const { data: appSettings } = useFindUniqueSettings({ where: { id: 'default' } })

  // Диалоги — state сохраняем, но диалоги не рендерим
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isAddTracksDialogOpen, setIsAddTracksDialogOpen] = useState(false)
  const [isRestoreTracksDialogOpen, setIsRestoreTracksDialogOpen] = useState(false)
  const [isReencodeDialogOpen, setIsReencodeDialogOpen] = useState(false)
  const [isEpisodeNameEditorOpen, setIsEpisodeNameEditorOpen] = useState(false)
  const [isAddEpisodesDialogOpen, setIsAddEpisodesDialogOpen] = useState(false)
  const [importAnimeInfo, setImportAnimeInfo] = useState<{ shikimoriId: number; name: string | null } | null>(null)
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false)
  const [isPublishingToTracker, setIsPublishingToTracker] = useState(false)
  const [isDetectingIntros, setIsDetectingIntros] = useState(false)
  const [isUnpinning, setIsUnpinning] = useState(false)
  const [isRepinning, setIsRepinning] = useState(false)
  const [isSyncingEpisodes, setIsSyncingEpisodes] = useState(false)

  const { data, isLoading } = useFindUniqueAnime({
    where: { id },
    include: {
      genres: { include: { genre: true } },
      themes: { include: { theme: true } },
      episodes: {
        orderBy: { number: 'asc' },
        include: {
          audioTracks: true,
          subtitleTracks: { include: { fonts: true } },
          season: true,
        },
      },
      seasons: true,
      watchProgress: { orderBy: { lastWatchedAt: 'desc' } },
      poster: true,
    },
  })

  const anime = data as AnimeWithRelations | null | undefined

  const { manifest } = useAnimeManifest(anime?.directoryCid)
  const { animeInfo } = useAnimeInfo(manifest?.animeInfoCid)

  // Callbacks (все из оригинала)
  const handleRefreshMetadata = useCallback(async () => {
    if (!anime?.shikimoriId || !window.electronAPI) {
      toaster.error({ title: 'Нет Shikimori ID' })
      return
    }
    setIsRefreshingMetadata(true)
    try {
      const result = await window.electronAPI.shikimori.getExtended(anime.shikimoriId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Не удалось загрузить метаданные')
      }
      const newName = result.data.russian ?? result.data.name
      const updates: Record<string, unknown> = {}
      if (newName && newName !== anime.name) {
        updates.name = newName
      }
      if (result.data.rating && result.data.rating !== anime.ageRating) {
        updates.ageRating = result.data.rating
      }
      if (Object.keys(updates).length > 0) {
        await updateAnime(anime.id, updates)
      }
      if (result.data.genres?.length) {
        const genres: ShikimoriGenreInput[] = result.data.genres.map((g) => ({
          id: g.id,
          name: g.name,
          russian: g.russian,
          kind: g.kind ?? 'genre',
        }))
        await saveGenresAndThemes(anime.id, genres)
      }
      if (window.electronAPI?.animeManifest) {
        await window.electronAPI.animeManifest.update(anime.id).catch(() => {})
      }
      const posterUrl = result.data.poster?.originalUrl || result.data.poster?.mainUrl
      if (posterUrl && anime.folderPath) {
        try {
          const posterResult = await window.electronAPI.shikimori.downloadPoster(posterUrl, String(anime.shikimoriId), {
            savePath: anime.folderPath,
          })
          if (posterResult.success && posterResult.localPath) {
            const posterUploadResult = await uploadToIpfs(posterResult.localPath)
            const posterCid = posterUploadResult?.cid
            const fileRecord = await upsertFile({
              filename: posterResult.filename ?? `${anime.shikimoriId}.jpg`,
              mimeType: posterResult.mimeType ?? 'image/jpeg',
              size: posterResult.size ?? 0,
              width: posterResult.width,
              height: posterResult.height,
              blurDataURL: posterResult.blurDataURL,
              category: 'POSTER',
              source: 'shikimori',
              cid: posterCid ?? undefined,
            })
            await updateAnime(anime.id, { posterId: fileRecord.id })
            if (posterCid) {
              window.electronAPI?.fs?.delete(posterResult.localPath, false).catch(() => {})
            }
          }
        } catch {
          // Ошибка постера не критична
        }
      }
      if (window.electronAPI.franchise) {
        const relationsResult = await window.electronAPI.franchise.fetchRelated(anime.shikimoriId)
        if (relationsResult.success && relationsResult.data) {
          const relations = relationsResult.data.relatedAnimes.map((related) => ({
            targetShikimoriId: related.shikimoriId,
            relationKind: related.relationKind as RelationKind,
          }))
          await syncAnimeRelations(anime.id, relations)
        }
        try {
          const graphResult = await window.electronAPI.franchise.fetchGraph(anime.shikimoriId)
          if (graphResult.success && graphResult.data?.graph) {
            const graph = graphResult.data.graph
            const allNodeIds = graph.nodes.map((n) => n.id)
            const rootShikimoriId = Math.min(...allNodeIds)
            await syncFranchiseFromGraph(null, rootShikimoriId, anime.name, allNodeIds)
          }
        } catch {
          // Ошибка графа не критична
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['animes'] })
      toaster.success({ title: 'Метаданные обновлены' })
    } catch (error) {
      toaster.error({
        title: 'Ошибка обновления',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      })
    } finally {
      setIsRefreshingMetadata(false)
    }
  }, [anime?.id, anime?.shikimoriId, anime?.name, anime?.folderPath, queryClient])

  const handleWatchStatusChange = useCallback(
    async (newStatus: WatchStatus) => {
      if (!anime) {
        return
      }
      try {
        await updateAnimeMutation.mutateAsync({ where: { id: anime.id }, data: { watchStatus: newStatus } })
        await queryClient.invalidateQueries({ queryKey: ['animes'] })
        toaster.success({ title: 'Статус обновлён' })
        // Немедленный push на трекер (не ждём 5-минутный полный sync)
        window.electronAPI?.tracker?.pushLibraryItem?.(anime.id)
      } catch (error) {
        toaster.error({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Не удалось обновить статус',
        })
      }
    },
    [anime, updateAnimeMutation, queryClient]
  )

  const handlePublishToTracker = useCallback(async () => {
    if (!anime?.directoryCid || !window.electronAPI) {
      toaster.error({ title: 'Сначала постройте IPFS-директорию' })
      return
    }
    setIsPublishingToTracker(true)
    try {
      const result = await window.electronAPI.ipfs.trackerPublish(anime.directoryCid)
      if (result.success && result.data?.success) {
        await queryClient.invalidateQueries({ queryKey: ['animes'] })
        await queryClient.invalidateQueries({ queryKey: ['anime', anime.id] })
        toaster.success({
          title: result.data.isReplacement ? 'Отправлено как кандидат на замену' : 'Опубликовано на трекер',
        })
      } else {
        toaster.error({ title: 'Ошибка публикации', description: result.error || 'Неизвестная ошибка' })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка публикации',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      })
    } finally {
      setIsPublishingToTracker(false)
    }
  }, [anime?.directoryCid, anime?.id, queryClient])

  const handleDetectIntros = useCallback(async () => {
    if (!anime?.episodes?.length || !window.electronAPI?.introDetector) {
      return
    }
    const episodesWithAudio: Array<{ id: string; audioCid: string; duration: number }> = []
    for (const ep of anime.episodes) {
      if (!ep.durationMs || !ep.audioTracks?.length) {
        continue
      }
      const tracks = ep.audioTracks.filter((t) => t.transcodedCid)
      if (tracks.length === 0) {
        continue
      }
      const japaneseTrack =
        tracks.find((t) => t.title?.toLowerCase().includes('оригинал')) ||
        tracks.find((t) => t.language === 'ja' || t.language === 'jpn') ||
        tracks.find((t) => t.title?.toLowerCase().includes('japanese')) ||
        tracks[0]
      episodesWithAudio.push({ id: ep.id, audioCid: japaneseTrack.transcodedCid!, duration: ep.durationMs })
    }
    if (episodesWithAudio.length < 2) {
      toaster.error({ title: 'Нужно минимум 2 эпизода с аудиодорожками' })
      return
    }
    setIsDetectingIntros(true)
    try {
      const results = await window.electronAPI.introDetector.detectFromIpfs(episodesWithAudio)
      for (const result of results) {
        const hasIntro = result.introStartMs !== null && result.introEndMs !== null
        const hasOutro = result.outroStartMs !== null && result.outroEndMs !== null
        if (!hasIntro && !hasOutro) {
          continue
        }
        const ep = anime.episodes.find((e) => e.id === result.episodeId)
        if (!ep?.manifestCid) {
          continue
        }
        const existingResult = await window.electronAPI.manifest.getChapters(ep.manifestCid)
        const existingChapters: ManifestChapter[] = existingResult.success ? (existingResult.data ?? []) : []
        const filtered = existingChapters.filter((ch) => ch.type !== 'op' && ch.type !== 'ed')
        const newChapters: ManifestChapter[] = [...filtered]
        if (hasIntro) {
          newChapters.push({
            startMs: result.introStartMs!,
            endMs: result.introEndMs!,
            title: 'Opening',
            type: 'op',
            skippable: true,
          })
        }
        if (hasOutro) {
          newChapters.push({
            startMs: result.outroStartMs!,
            endMs: result.outroEndMs!,
            title: 'Ending',
            type: 'ed',
            skippable: true,
          })
        }
        newChapters.sort((a, b) => a.startMs - b.startMs)
        await window.electronAPI.manifest.updateChapters(result.episodeId, newChapters)
      }
      await queryClient.invalidateQueries({ queryKey: ['animes'] })
      await queryClient.invalidateQueries({ queryKey: ['episodeChapters'] })
      const foundIntros = results.filter((r) => r.introStartMs !== null).length
      const foundOutros = results.filter((r) => r.outroStartMs !== null).length
      toaster.success({ title: 'Определение OP/ED завершено', description: `OP: ${foundIntros}, ED: ${foundOutros}` })
    } catch (error) {
      toaster.error({
        title: 'Ошибка определения OP/ED',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      })
    } finally {
      setIsDetectingIntros(false)
    }
  }, [anime?.episodes, queryClient])

  // Наличие битых дорожек
  const hasBrokenTracks = anime?.episodes?.some(
    (ep) =>
      ep.audioTracks.length === 0 ||
      ep.audioTracks.some((t) => !t.transcodedCid) ||
      ep.subtitleTracks.length === 0 ||
      ep.subtitleTracks.some((t) => !t.fileCid)
  )

  // Открепить контент с диска
  const handleUnpin = useCallback(async () => {
    if (!anime || !window.electronAPI?.tracker) {
      return
    }
    setIsUnpinning(true)
    try {
      const result = await window.electronAPI.tracker.unpinAnime(anime.id)
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['animes'] })
        toaster.success({ title: 'Контент откреплён', description: 'Данные доступны через удалённые пиры' })
      } else {
        toaster.error({ title: 'Ошибка откреплениe', description: result.error })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка откреплениe',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      })
    } finally {
      setIsUnpinning(false)
    }
  }, [anime, queryClient])

  // Закрепить контент на диск
  const handleRepin = useCallback(async () => {
    if (!anime || !window.electronAPI?.tracker) {
      return
    }
    setIsRepinning(true)
    try {
      const result = await window.electronAPI.tracker.repinAnime(anime.id)
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ['animes'] })
        toaster.success({ title: 'Контент закреплён', description: 'Данные скачаны на диск' })
      } else {
        toaster.error({ title: 'Ошибка закреплениe', description: result.error })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка закреплениe',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      })
    } finally {
      setIsRepinning(false)
    }
  }, [anime, queryClient])

  // Загрузить новые серии из IPFS (онгоинги)
  const handleSyncEpisodes = useCallback(async () => {
    if (!anime || !window.electronAPI?.library) {
      return
    }
    setIsSyncingEpisodes(true)
    try {
      const result = await window.electronAPI.library.syncEpisodes(anime.id)
      if (result.success && result.data) {
        await queryClient.invalidateQueries({ queryKey: ['animes'] })
        const { added, total } = result.data
        if (added > 0) {
          toaster.success({
            title: `Добавлено ${added} новых серий`,
            description: `Всего в манифесте: ${total}`,
          })
        } else {
          toaster.info({ title: 'Новых серий нет', description: `В манифесте ${total} серий, все уже в библиотеке` })
        }
      } else {
        toaster.error({ title: 'Ошибка синхронизации', description: result.error })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка синхронизации',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      })
    } finally {
      setIsSyncingEpisodes(false)
    }
  }, [anime, queryClient])

  // Суммарный IPFS размер
  const { totalIpfsSize, ipfsSizeBreakdown } = useMemo(() => {
    if (!anime?.episodes) {
      return { totalIpfsSize: 0, ipfsSizeBreakdown: { video: 0, audio: 0, subtitles: 0, fonts: 0 } }
    }
    let video = 0,
      audio = 0,
      subtitles = 0,
      fonts = 0
    for (const ep of anime.episodes) {
      video += ep.ipfsSize ?? 0
      for (const at of ep.audioTracks) {
        audio += at.ipfsSize ?? 0
      }
      for (const st of ep.subtitleTracks) {
        subtitles += st.ipfsSize ?? 0
        for (const f of st.fonts) {
          fonts += f.ipfsSize ?? 0
        }
      }
    }
    return { totalIpfsSize: video + audio + subtitles + fonts, ipfsSizeBreakdown: { video, audio, subtitles, fonts } }
  }, [anime?.episodes])

  if (isLoading) {
    return (
      <Box minH="100vh" bg="bg" color="fg">
        <Header title="Загрузка..." />
        <Box p={6}>
          <Spinner size="lg" color="purple.500" />
        </Box>
      </Box>
    )
  }

  if (!anime) {
    return (
      <Box minH="100vh" bg="bg" color="fg">
        <Header title="Не найдено" />
        <Box p={6}>
          <Text color="fg.subtle">Аниме не найдено</Text>
          <Button mt={4} variant="outline" onClick={() => router.push('/library')}>
            <Icon as={LuArrowLeft} mr={2} />
            Вернуться в библиотеку
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box minH="100vh" bg="bg" color="fg">
      <Header title={anime.name} />

      <VStack gap={0} align="stretch">
        {/* Навигация */}
        <HStack px={6} py={3} justify="space-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/library')}>
            <Icon as={LuArrowLeft} mr={2} />
            Назад к библиотеке
          </Button>
          {anime.rutrackerUrl && (
            <Button
              variant="ghost"
              size="sm"
              colorPalette="blue"
              onClick={() => anime.rutrackerUrl && window.electronAPI?.app.openExternal(anime.rutrackerUrl)}
            >
              <Icon as={LuExternalLink} mr={1} />
              Rutracker
            </Button>
          )}
        </HStack>

        {/* Hero Section */}
        <AnimeHero
          name={anime.name}
          originalName={anime.originalName}
          year={anime.year}
          status={anime.status}
          watchStatus={anime.watchStatus}
          watchedAt={anime.watchedAt}
          rating={anime.rating}
          episodeCount={anime.episodeCount}
          loadedEpisodeCount={anime.episodes?.length || 0}
          totalIpfsSize={totalIpfsSize}
          ipfsSizeBreakdown={ipfsSizeBreakdown}
          genres={anime.genres}
          themes={anime.themes}
          posterPath={toPlayableUrl({ cid: anime.poster?.cid ?? anime.posterCid }) ?? undefined}
          watchProgress={anime.watchProgress}
          episodes={anime.episodes?.map((ep) => ({ id: ep.id, number: ep.number, durationMs: ep.durationMs }))}
          actionMenuProps={{
            onEdit: () => setIsEditDialogOpen(true),
            onExport: () => setIsExportDialogOpen(true),
            onAddTracks: () => setIsAddTracksDialogOpen(true),
            onDelete: () => setIsDeleteDialogOpen(true),
            hasShikimoriId: !!anime.shikimoriId,
            isRefreshingMetadata,
            onRefreshMetadata: handleRefreshMetadata,
            watchStatus: anime.watchStatus,
            onWatchStatusChange: handleWatchStatusChange,
            hasDirectoryCid: !!anime.directoryCid,
            directoryCid: anime.directoryCid ?? undefined,
            isPublishingToTracker,
            onPublishToTracker: handlePublishToTracker,
            episodeCount: anime.episodes?.length || 0,
            isDetectingIntros,
            onDetectIntros: handleDetectIntros,
            hasBrokenTracks,
            onRestoreTracks: () => setIsRestoreTracksDialogOpen(true),
            sourceUrl: anime.rutrackerUrl ?? undefined,
            onReencodeAudio: () => setIsReencodeDialogOpen(true),
            pinnedLocally: anime.pinnedLocally ?? undefined,
            isUnpinning,
            isRepinning,
            onUnpin: handleUnpin,
            onRepin: handleRepin,
            isSyncingEpisodes,
            onSyncEpisodes: anime.directoryCid ? handleSyncEpisodes : undefined,
            onAddEpisodes: () => setIsAddEpisodesDialogOpen(true),
          }}
        />

        {/* Ошибки импорта */}
        <Box px={6} pt={4}>
          <ImportErrorsSection animeId={anime.id} />
        </Box>

        {/* Табы */}
        <Box px={6} py={4}>
          <AnimeDetailTabs
            value={currentTab}
            onValueChange={handleTabChange}
            episodeCount={anime.episodes?.length || 0}
            hasVideos={!!animeInfo?.videos && animeInfo.videos.length > 0}
            hasFranchise={!!anime.shikimoriId}
            hasTracks={anime.episodes?.some((ep) => ep.audioTracks.length > 0 || ep.subtitleTracks.length > 0)}
          >
            {{
              episodes: (
                <EpisodesTab
                  episodes={anime.episodes || []}
                  watchProgress={anime.watchProgress}
                  onEditNames={() => setIsEpisodeNameEditorOpen(true)}
                />
              ),
              about: <AboutTab animeId={anime.id} shikimoriId={anime.shikimoriId} />,
              tracks: (
                <TracksTab
                  audioTracks={
                    anime.episodes?.flatMap((ep) =>
                      ep.audioTracks.map((track) => ({ ...track, episodeNumber: ep.number }))
                    ) || []
                  }
                  subtitleTracks={
                    anime.episodes?.flatMap((ep) =>
                      ep.subtitleTracks.map((track) => ({ ...track, episodeNumber: ep.number }))
                    ) || []
                  }
                />
              ),
              related: (
                <RelatedTab
                  animeId={anime.id}
                  shikimoriId={anime.shikimoriId}
                  relationsCheckedAt={anime.relationsCheckedAt}
                  onDownloadClick={(shikimoriId, name) => {
                    setImportAnimeInfo({ shikimoriId, name })
                    setIsImportDialogOpen(true)
                  }}
                />
              ),
              franchise: (
                <FranchiseTab
                  animeId={anime.id}
                  shikimoriId={anime.shikimoriId}
                  franchiseId={anime.franchiseId}
                  animeName={anime.name}
                />
              ),
              videos: <VideoSection videos={animeInfo?.videos || []} />,
            }}
          </AnimeDetailTabs>
        </Box>
      </VStack>

      {/* Диалоги — условный рендер чтобы хуки не работали при закрытом диалоге */}
      {isDeleteDialogOpen && (
        <DeleteAnimeDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          anime={{ id: anime.id, name: anime.name, episodeCount: anime.episodes?.length || 0 }}
          onDeleted={() => router.push('/library')}
        />
      )}
      {isEditDialogOpen && <EditAnimeDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} anime={anime} />}
      {isExportDialogOpen && (
        <ExportSeriesDialog
          open={isExportDialogOpen}
          onOpenChange={setIsExportDialogOpen}
          anime={{
            id: anime.id,
            name: anime.name,
            year: anime.year,
            posterPath: toPlayableUrl({ cid: anime.poster?.cid ?? anime.posterCid }) ?? undefined,
            episodes: anime.episodes || [],
            shikimoriId: anime.shikimoriId,
            franchiseId: anime.franchiseId,
          }}
        />
      )}
      {isImportDialogOpen && (
        <ImportWizardDialog
          open={isImportDialogOpen}
          onOpenChange={(open) => {
            setIsImportDialogOpen(open)
            if (!open) {
              setImportAnimeInfo(null)
            }
          }}
          preselectedShikimoriId={importAnimeInfo?.shikimoriId}
          preselectedName={importAnimeInfo?.name ?? undefined}
        />
      )}
      {isAddEpisodesDialogOpen && (
        <ImportWizardDialog
          open={isAddEpisodesDialogOpen}
          onOpenChange={setIsAddEpisodesDialogOpen}
          preselectedShikimoriId={anime.shikimoriId ?? undefined}
          preselectedName={anime.name}
          existingAnimeId={anime.id}
          onQueued={() => queryClient.invalidateQueries({ queryKey: ['animes'] })}
        />
      )}
      {isAddTracksDialogOpen && (
        <AddTracksWizardDialog
          open={isAddTracksDialogOpen}
          onOpenChange={(open) => {
            setIsAddTracksDialogOpen(open)
            if (!open) {
              queryClient.invalidateQueries({ queryKey: ['animes'] })
            }
          }}
          animeId={anime.id}
          animeName={anime.name}
          animeFolderPath={anime.folderPath ?? ''}
          episodes={
            anime.episodes?.map((ep) => ({ id: ep.id, number: ep.number, transcodedCid: ep.transcodedCid })) || []
          }
        />
      )}
      {isRestoreTracksDialogOpen && (
        <RestoreTracksDialog
          open={isRestoreTracksDialogOpen}
          onOpenChange={(open) => {
            setIsRestoreTracksDialogOpen(open)
            if (!open) {
              queryClient.invalidateQueries({ queryKey: ['animes'] })
            }
          }}
          animeId={anime.id}
          animeName={anime.name}
          animeFolderPath={anime.folderPath ?? ''}
          episodes={
            anime.episodes?.map((ep) => ({
              id: ep.id,
              number: ep.number,
              folderPath: ep.folderPath,
              transcodedCid: ep.transcodedCid,
              metadataCid: ep.metadataCid,
              audioTracks: ep.audioTracks,
              subtitleTracks: ep.subtitleTracks,
            })) || []
          }
        />
      )}
      {isEpisodeNameEditorOpen && (
        <EpisodeNameEditor
          open={isEpisodeNameEditorOpen}
          onOpenChange={setIsEpisodeNameEditorOpen}
          animeId={anime.id}
          episodes={anime.episodes?.map((ep) => ({ id: ep.id, number: ep.number, name: ep.name })) || []}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['animes'] })}
        />
      )}
      {isReencodeDialogOpen && (
        <ReencodeAudioDialog
          open={isReencodeDialogOpen}
          onOpenChange={setIsReencodeDialogOpen}
          animeId={anime.id}
          targetBitrate={appSettings?.audioBitrate ?? 192}
        />
      )}
    </Box>
  )
}
