'use client'

import { Box, Button, Grid, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { LuArrowLeft, LuDownload, LuLibrary, LuPlay, LuRefreshCw, LuUpload } from 'react-icons/lu'

import { DiscoverRelatedList } from '@/components/discover/DiscoverRelatedList'
import { DiscoverTracksView } from '@/components/discover/DiscoverTracksView'
import { Header } from '@/components/layout'
import { AboutTab, AnimeDetailTabs, AnimeHero, FranchiseTab } from '@/components/library/anime-detail'
import { EpisodeCard } from '@/components/library/EpisodeCard'
import { VideoSection } from '@/components/library/VideoSection'
import { useFindManyAnime } from '@/lib/hooks'
import { useAnimeIpfsData } from '@/lib/hooks/use-anime-ipfs-data'
import { useCoverUrl } from '@/lib/hooks/use-cover-url'
import { useRouter } from 'next/navigation'
import type { TrackerAnimeDetail } from '../../../../../shared/types/tracker'

export default function DiscoverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: animeId } = use(params)
  const router = useRouter()
  const [anime, setAnime] = useState<TrackerAnimeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importingCid, setImportingCid] = useState(false)
  const getCoverUrl = useCoverUrl()

  // Проверяем наличие в локальной библиотеке по shikimoriId (стабильный ключ)
  const shikimoriId = anime?.shikimoriId ?? null
  const { data: localMatch } = useFindManyAnime(
    shikimoriId != null
      ? {
          where: { shikimoriId },
          select: { id: true, directoryCid: true, trackerPublishedCid: true },
          take: 1,
        }
      : { where: { id: '__never__' }, select: { id: true }, take: 0 }
  )
  const localAnime = localMatch?.[0] as
    { id: string; directoryCid?: string | null; trackerPublishedCid?: string | null } | undefined
  const localId = localAnime?.id

  // Определяем статус синхронизации CID
  const syncStatus = useMemo<'same' | 'local-newer' | 'tracker-newer' | null>(() => {
    if (!localAnime || !anime?.directoryCid) {
      return null
    }
    const localCid = localAnime.directoryCid
    const trackerCid = anime.directoryCid
    if (!localCid || !trackerCid) {
      return null
    }
    if (localCid === trackerCid) {
      return 'same'
    }
    // Если trackerPublishedCid совпадает с трекером → значит локально обновлено после публикации
    if (localAnime.trackerPublishedCid === trackerCid) {
      return 'local-newer'
    }
    // Иначе трекер содержит версию, которую мы не публиковали → трекер новее
    return 'tracker-newer'
  }, [localAnime, anime?.directoryCid])

  // Загружаем данные аниме из IPFS (превью, связи, видео, дорожки)
  const ipfsData = useAnimeIpfsData(anime?.directoryCid)

  const loadDetail = useCallback(async () => {
    if (!animeId) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tracker preload не типизирован в electron.d.ts
      const ipcResult = await (window.electronAPI as any).tracker.getAnimeDetail(animeId)
      const detailResult = ipcResult?.data ?? ipcResult
      if (detailResult?.success && detailResult.data) {
        setAnime(detailResult.data)
      } else {
        setError(detailResult?.error || 'Аниме не найдено')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }, [animeId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const [publishing, setPublishing] = useState(false)

  /** Импортировать аниме в локальную библиотеку */
  const handleImport = async () => {
    if (!anime?.directoryCid) {
      return
    }
    setImportingCid(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- manifest preload не типизирован
      await (window.electronAPI as any).animeManifest.import(anime.directoryCid)
    } finally {
      setImportingCid(false)
    }
  }

  /** Опубликовать локальную версию на трекер */
  const handlePublishToTracker = async () => {
    if (!localAnime?.directoryCid) {
      return
    }
    setPublishing(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tracker preload не типизирован
      await (window.electronAPI as any).tracker.publish(localAnime.directoryCid)
      // Перезагружаем детали чтобы обновить CID
      await loadDetail()
    } finally {
      setPublishing(false)
    }
  }

  /** Обновить локальную библиотеку из трекера */
  const handleUpdateFromTracker = async () => {
    if (!anime?.directoryCid) {
      return
    }
    setImportingCid(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- manifest preload не типизирован
      await (window.electronAPI as any).animeManifest.import(anime.directoryCid)
    } finally {
      setImportingCid(false)
    }
  }

  /** Перейти к просмотру эпизода */
  const handlePlayEpisode = useCallback(
    (episode: TrackerAnimeDetail['episodes'][number]) => {
      const title = anime?.title ?? ''
      const searchParams = new URLSearchParams({
        cid: episode.videoCid,
        title,
        ep: String(episode.number),
      })
      if (animeId) {
        searchParams.set('animeId', animeId)
      }
      router.push(`/discover/watch?${searchParams.toString()}`)
    },
    [anime?.title, animeId]
  )

  if (loading) {
    return (
      <Box minH="100vh" bg="bg" color="fg">
        <Header title="Загрузка..." />
        <Box textAlign="center" py={16}>
          <Spinner size="xl" />
          <Text mt={4} color="fg.muted">
            Загрузка...
          </Text>
        </Box>
      </Box>
    )
  }

  if (error || !anime) {
    return (
      <Box minH="100vh" bg="bg" color="fg">
        <Header title="Не найдено" />
        <VStack gap={4} py={16}>
          <Text color="red.500">{error || 'Аниме не найдено'}</Text>
          <Button onClick={() => router.push('/discover')} variant="outline">
            <Icon as={LuArrowLeft} mr={2} />
            Назад к каталогу
          </Button>
        </VStack>
      </Box>
    )
  }

  const posterUrl = getCoverUrl(anime.coverUrl)

  /** CTA кнопки для AnimeHero */
  const ctaSlot = (
    <>
      {localId ? (
        <>
          <Button colorPalette="green" onClick={() => router.push(`/library/${localId}`)}>
            <Icon as={LuLibrary} />
            Открыть в библиотеке
          </Button>
          {/* Версия на трекере отличается — предложить действие */}
          {syncStatus === 'local-newer' && (
            <Button colorPalette="blue" onClick={handlePublishToTracker} loading={publishing} variant="outline">
              <Icon as={LuUpload} />
              Опубликовать на трекер
            </Button>
          )}
          {syncStatus === 'tracker-newer' && (
            <Button colorPalette="orange" onClick={handleUpdateFromTracker} loading={importingCid} variant="outline">
              <Icon as={LuRefreshCw} />
              Обновить из трекера
            </Button>
          )}
        </>
      ) : (
        anime.directoryCid && (
          <Button colorPalette="green" onClick={handleImport} loading={importingCid}>
            <Icon as={LuDownload} />
            Импортировать
          </Button>
        )
      )}
      {anime.episodes.length > 0 && (
        <Button colorPalette="purple" onClick={() => handlePlayEpisode(anime.episodes[0])}>
          <Icon as={LuPlay} />
          Смотреть Эп.1
        </Button>
      )}
    </>
  )

  return (
    <Box minH="100vh" bg="bg" color="fg">
      <Header title={anime.title} />

      <VStack gap={0} align="stretch">
        {/* Навигация */}
        <Box px={6} py={3}>
          <Button variant="ghost" size="sm" onClick={() => router.push('/discover')}>
            <Icon as={LuArrowLeft} mr={2} />
            Назад к каталогу
          </Button>
        </Box>

        {/* Hero Section */}
        <AnimeHero
          name={anime.title}
          originalName={anime.titleOriginal}
          year={anime.year}
          episodeCount={anime.episodes.length}
          loadedEpisodeCount={anime.episodes.length}
          genreNames={anime.genres}
          posterUrl={posterUrl}
          ctaSlot={ctaSlot}
        />

        {/* Табы с контентом */}
        <Box px={6} py={4}>
          <AnimeDetailTabs
            episodeCount={anime.episodes.length}
            hasVideos={!!ipfsData.animeInfo?.videos?.length}
            hasFranchise={!!anime.shikimoriId}
            hasTracks={!!ipfsData.tracksSummary}
            hasRelated={ipfsData.relations.length > 0}
          >
            {{
              episodes: (
                <Grid
                  templateColumns={{
                    base: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(4, 1fr)',
                    xl: 'repeat(5, 1fr)',
                  }}
                  gap={4}
                >
                  {anime.episodes.map((episode) => {
                    const preview = ipfsData.episodePreviews.get(episode.number)
                    return (
                      <EpisodeCard
                        key={episode.id}
                        id={episode.id}
                        number={episode.number}
                        name={episode.title}
                        durationMs={episode.duration ? episode.duration * 1000 : null}
                        thumbnailCids={preview?.thumbnailCids ?? null}
                        screenshotCids={preview?.screenshotCids ?? null}
                        manifestCid={ipfsData.episodeManifestCids.get(episode.number) ?? null}
                        metadataCid={ipfsData.episodeMetadataCids.get(episode.number) ?? null}
                        videoCodec={ipfsData.videoSummary?.codec}
                        videoHeight={ipfsData.videoSummary?.height}
                        videoBitDepth={ipfsData.videoSummary?.bitDepth}
                        watchStatus="unwatched"
                        onPlay={() => handlePlayEpisode(episode)}
                      />
                    )
                  })}
                </Grid>
              ),
              about: (
                <AboutTab
                  animeId={animeId}
                  description={ipfsData.animeInfo?.description ?? anime.description}
                  shikimoriId={anime.shikimoriId}
                />
              ),
              related:
                ipfsData.relations.length > 0 ? <DiscoverRelatedList relations={ipfsData.relations} /> : undefined,
              franchise: anime.shikimoriId ? (
                <FranchiseTab
                  animeId={animeId}
                  shikimoriId={anime.shikimoriId}
                  franchiseId={null}
                  animeName={anime.title}
                />
              ) : undefined,
              videos: ipfsData.animeInfo?.videos?.length ? (
                <VideoSection videos={ipfsData.animeInfo.videos} />
              ) : undefined,
              tracks: ipfsData.tracksSummary ? (
                <DiscoverTracksView tracksSummary={ipfsData.tracksSummary} />
              ) : undefined,
            }}
          </AnimeDetailTabs>
        </Box>
      </VStack>
    </Box>
  )
}
