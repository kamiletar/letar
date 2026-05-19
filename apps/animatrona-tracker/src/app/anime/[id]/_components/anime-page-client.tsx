'use client'

/**
 * Клиентская обёртка страницы аниме
 *
 * Получает все данные с сервера (page.tsx) и рендерит
 * Hero + Tabs (Episodes, About, Related, Franchise, Videos).
 */

import { Box, Container } from '@chakra-ui/react'
import type {
  AnimeManifest,
  AnimeManifestRelation,
  AnimeManifestVideo,
  FranchiseGraphDocument,
} from '@letar/animatrona-types'

import { Breadcrumbs } from '@/app/_components/breadcrumbs'

import { AboutSection } from './about-section'
import { AdminSection } from './admin-section'
import { AnimeDetailTabs } from './anime-detail-tabs'
import { AnimeHero } from './anime-hero'
import { CommentsSection } from './comments-section'
import { ContinueWatchingButton } from './continue-watching-button'
import { EpisodesGrid } from './episodes-grid'
import { FranchiseGraphDynamic } from './franchise-graph/franchise-graph-dynamic'
import { RelatedSection } from './related-section'
import { type SimilarAnimeItem, SimilarSection } from './similar-section'
import { VideoSection } from './video-section'

/** Данные аниме из БД */
interface AnimeDbData {
  id: string
  title: string
  titleOriginal: string | null
  description: string | null
  coverUrl: string | null

  year: number | null
  studio: string | null
  genres: string[]
  status: string
  shikimoriId: number | null
  /** CID директории аниме в IPFS */
  directoryCid: string | null
  /** Количество уникальных зрителей */
  viewCount: number
  /** Количество добавлений в библиотеку */
  libraryCount: number
  /** Средний рейтинг пользователей (0-10) */
  avgRating: number | null
  episodes: Array<{
    id: string
    number: number
    title: string | null
    duration: number | null
    videoCid: string
  }>
  uploadedBy: {
    id: string
    name: string | null
    image: string | null
  }
}

/** Данные из IPFS-манифеста */
interface ManifestData {
  manifest: AnimeManifest | null
  relations: AnimeManifestRelation[]
  franchiseGraph: FranchiseGraphDocument | null
  previewMap: Record<string, { thumbnailCids: string[]; screenshotCids: string[] }>
  videos: AnimeManifestVideo[]
}

/** Данные для вкладки администратора */
export interface AnimeAdminData {
  pinnedOn: {
    id: string
    name: string
    role: string
    status: string
    apiUrl: string
    peerId: string | null
    usedBytes: number
    capacityBytes: number
  } | null
  viewers: Array<{
    userId: string
    userName: string | null
    userImage: string | null
    watchStatus: string
    userRating: number | null
    addedAt: Date
    pinnedLocally: boolean
  }>
}

export interface AnimePageClientProps {
  anime: AnimeDbData
  manifestData: ManifestData
  /** libraryMap: shikimoriId → slug для внутренних ссылок */
  libraryMap: Record<string, string>
  /** Похожие аниме по жанрам */
  similarAnime: SimilarAnimeItem[]
  /** Slug для URL (shikimoriId или id) */
  animeSlug: string
  isAuthenticated: boolean
  userId?: string
  userRole?: string
  /** Количество комментариев для бейджа */
  commentCount?: number
  /** Количество онлайн сидов (из Redis) */
  onlineSeedCount?: number
  /** Данные для вкладки администратора (только для ADMIN) */
  adminData?: AnimeAdminData
}

export function AnimePageClient({
  anime,
  manifestData,
  libraryMap,
  similarAnime,
  animeSlug,
  isAuthenticated,
  userId,
  userRole,
  commentCount,
  onlineSeedCount,
  adminData,
}: AnimePageClientProps) {
  const { manifest, relations, franchiseGraph, videos } = manifestData
  const previewMap = new Map(Object.entries(manifestData.previewMap).map(([k, v]) => [Number(k), v] as const))

  // Преобразуем libraryMap из Record в Map
  const libraryMapObj = new Map(Object.entries(libraryMap).map(([k, v]) => [Number(k), v]))

  // Данные для hero из манифеста + БД
  const posterUrl = anime.coverUrl?.startsWith('ipfs://')
    ? anime.coverUrl.replace('ipfs://', `${process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.letar.best'}/ipfs/`)
    : anime.coverUrl || undefined

  // Эпизоды для компонентов (duration в секундах)
  const episodes = anime.episodes.map((ep) => ({
    number: ep.number,
    name: ep.title || undefined,
    duration: ep.duration || 0,
  }))

  // Общая длительность и размер
  const totalDuration = episodes.reduce((sum, ep) => sum + ep.duration, 0)
  const totalSize = 0 // TODO: directorySize из БД

  return (
    <Box minH="100vh" bg="bg">
      {/* Хлебные крошки */}
      <Box bg="bg.panel" borderBottomWidth="1px" py={3}>
        <Container maxW="container.xl">
          <Breadcrumbs items={[{ label: 'Каталог', href: '/anime' }, { label: anime.title }]} />
        </Container>
      </Box>

      {/* Hero */}
      <AnimeHero
        name={anime.title}
        originalName={anime.titleOriginal || undefined}
        year={anime.year || undefined}
        status={manifest?.status || undefined}
        kind={manifest?.kind || undefined}
        rating={manifest?.rating || undefined}
        ageRating={manifest?.ageRating || undefined}
        episodeCount={episodes.length}
        totalDuration={totalDuration}
        totalSize={totalSize}
        genres={
          anime.genres.length > 0
            ? anime.genres
            : manifest?.genres?.map((g: { nameRu?: string; name: string }) => g.nameRu || g.name)
        }
        themes={manifest?.themes?.map((t: { nameRu?: string; name: string }) => t.nameRu || t.name)}
        posterUrl={posterUrl}
        isBdRemux={manifest?.isBdRemux}
        animeSlug={animeSlug}
        viewCount={anime.viewCount}
        libraryCount={anime.libraryCount}
        avgRating={anime.avgRating}
        onlineSeedCount={onlineSeedCount}
        episodes={episodes}
        ctaButton={<ContinueWatchingButton animeSlug={animeSlug} episodes={episodes} />}
      />

      {/* Вкладки с контентом */}
      <Container maxW="container.xl" py={6}>
        <AnimeDetailTabs
          episodeCount={episodes.length}
          commentCount={commentCount}
          sections={{
            episodes: (
              <EpisodesGrid
                episodes={episodes}
                animeSlug={animeSlug}
                previewMap={previewMap}
                isAuthenticated={isAuthenticated}
                directoryCid={anime.directoryCid}
              />
            ),
            about: (
              <AboutSection
                description={anime.description || manifest?.description || undefined}
                studios={manifest?.studios}
                staff={manifest?.staff}
                characters={manifest?.characters}
                fandubbers={manifest?.fandubbers}
                fansubbers={manifest?.fansubbers}
                externalIds={manifest?.externalIds}
                externalLinks={manifest?.externalLinks}
                dbShikimoriId={anime.shikimoriId}
                source={manifest?.source}
                licensor={manifest?.licensor}
              />
            ),
            related:
              relations.length > 0 ? <RelatedSection relations={relations} libraryMap={libraryMapObj} /> : undefined,
            franchise:
              franchiseGraph && franchiseGraph.nodes?.length > 0 ? (
                <FranchiseGraphDynamic
                  graph={franchiseGraph}
                  currentShikimoriId={anime.shikimoriId || undefined}
                  libraryMap={libraryMapObj}
                />
              ) : undefined,
            similar:
              similarAnime.length > 0 ? (
                <SimilarSection items={similarAnime} currentGenres={anime.genres} />
              ) : undefined,
            videos: videos.length > 0 ? <VideoSection videos={videos} /> : undefined,
            comments: (
              <CommentsSection
                animeId={anime.id}
                isAuthenticated={isAuthenticated}
                currentUserId={userId}
                currentUserRole={userRole}
              />
            ),
            admin: adminData ? (
              <AdminSection
                pinnedOn={adminData.pinnedOn}
                viewers={adminData.viewers}
                viewCount={anime.viewCount}
              />
            ) : undefined,
          }}
        />
      </Container>
    </Box>
  )
}
