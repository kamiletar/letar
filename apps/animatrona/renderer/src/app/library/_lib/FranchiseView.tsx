'use client'

/**
 * Компонент для отображения аниме сгруппированных по франшизам
 */

import { AspectRatio, Box, Grid, Icon, Skeleton, Text, VStack } from '@chakra-ui/react'
import { LuLayers } from 'react-icons/lu'

import { AnimeCard, FranchiseCard } from '@/components/library'
import type { WatchStatus } from '@/generated/prisma'
import { toPlayableUrl } from '@/lib/media-url'

import type { AnimeWithFranchise, FranchiseGroup } from './types'

/** Пропсы для FranchiseView */
export interface FranchiseViewProps {
  franchiseGroups: FranchiseGroup[]
  standAloneAnimes: AnimeWithFranchise[]
  isLoading?: boolean
  /** Колбэки для меню карточек */
  onPlay?: (id: string) => void
  onExport?: (id: string) => void
  onRefreshMetadata?: (id: string) => void
  onDelete?: (id: string) => void
  /** Колбэк для изменения статуса просмотра */
  onWatchStatusChange?: (id: string, status: WatchStatus) => void
}

/**
 * Скелетон загрузки — плитки в формате сетки
 */
function LoadingSkeleton() {
  return (
    <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Box key={i}>
          <AspectRatio ratio={2 / 3}>
            <Skeleton borderRadius="md" />
          </AspectRatio>
        </Box>
      ))}
    </Grid>
  )
}

/**
 * Пустое состояние (нет контента)
 */
function EmptyState() {
  return (
    <Box textAlign="center" py={16} px={4} borderRadius="xl" border="2px dashed" borderColor="border.subtle">
      <VStack gap={4}>
        <Icon as={LuLayers} boxSize={16} color="fg.subtle" />
        <Box>
          <Text fontSize="xl" fontWeight="semibold" color="fg.muted">
            Аниме не найдено
          </Text>
          <Text color="fg.subtle">Попробуйте изменить параметры поиска или добавьте новое аниме</Text>
        </Box>
      </VStack>
    </Box>
  )
}

export function FranchiseView({
  franchiseGroups,
  standAloneAnimes,
  isLoading,
  onPlay,
  onExport,
  onRefreshMetadata,
  onDelete,
  onWatchStatusChange,
}: FranchiseViewProps) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasContent = franchiseGroups.length > 0 || standAloneAnimes.length > 0

  if (!hasContent) {
    return <EmptyState />
  }

  return (
    <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4} alignItems="stretch">
      {/* Франшизы — плитки с постерами и стопкой */}
      {franchiseGroups.map((group) => {
        const mainAnime = group.animes[0]
        const relatedAnimes = group.animes.slice(1)

        return (
          <FranchiseCard
            key={group.franchise.id}
            name={group.franchise.name}
            mainAnime={{
              id: mainAnime.id,
              title: mainAnime.name,
              posterUrl: toPlayableUrl({ cid: mainAnime.poster?.cid }) ?? undefined,
              year: mainAnime.year,
              episodesTotal: mainAnime.episodeCount,
              episodesLoaded: mainAnime.episodeCount,
              watchStatus: mainAnime.watchStatus,
            }}
            relatedAnimes={relatedAnimes.map((anime) => ({
              id: anime.id,
              title: anime.name,
              posterUrl: toPlayableUrl({ cid: anime.poster?.cid }) ?? undefined,
              year: anime.year,
              episodesTotal: anime.episodeCount,
              episodesLoaded: anime.episodeCount,
            }))}
            missingAnimes={group.missingAnimes.map((rel) => ({
              shikimoriId: rel.targetShikimoriId,
              title: `Аниме #${rel.targetShikimoriId}`,
              posterUrl: null,
              year: null,
              kind: null,
            }))}
            onPlay={onPlay}
            onExport={onExport}
            onRefreshMetadata={onRefreshMetadata}
            onDelete={onDelete}
            onWatchStatusChange={onWatchStatusChange}
          />
        )
      })}

      {/* Одиночные аниме без франшизы — те же AnimeCard в той же сетке */}
      {standAloneAnimes.map((anime) => (
        <AnimeCard
          key={anime.id}
          id={anime.id}
          name={anime.name}
          originalName={anime.originalName}
          year={anime.year}
          status={anime.status}
          episodeCount={anime.episodeCount}
          rating={anime.rating}
          posterPath={toPlayableUrl({ cid: anime.poster?.cid }) ?? undefined}
          genres={anime.genres?.map((g) => g.genre.name)}
          watchStatus={anime.watchStatus}
          onPlay={onPlay}
          onExport={onExport}
          onRefreshMetadata={onRefreshMetadata}
          onDelete={onDelete}
          onWatchStatusChange={onWatchStatusChange}
        />
      ))}
    </Grid>
  )
}
