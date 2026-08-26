'use client'

/**
 * Компонент для отображения аниме сгруппированных по франшизам
 */

import { AspectRatio, Box, Grid, Skeleton, Text, VStack } from '@chakra-ui/react'
import { LuLayers } from 'react-icons/lu'

import { AnimeCard, FranchiseCard } from '@/components/library'
import type { WatchStatus } from '@/generated/prisma'
import { useVirtualizedGrid } from '@/lib/hooks/use-virtualized-grid'
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

/** Элемент единой сетки — франшиза или одиночное аниме, порядок как в исходном рендере */
type ViewItem = { kind: 'franchise'; group: FranchiseGroup } | { kind: 'standalone'; anime: AnimeWithFranchise }

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
        <LuLayers size={64} color="var(--chakra-colors-fg-subtle)" />
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
  const items: ViewItem[] = [
    ...franchiseGroups.map((group): ViewItem => ({ kind: 'franchise', group })),
    ...standAloneAnimes.map((anime): ViewItem => ({ kind: 'standalone', anime })),
  ]

  const { containerRef, columns, rowVirtualizer } = useVirtualizedGrid(items.length, {
    // FranchiseCard может быть выше AnimeCard (стопка постеров) — оценка грубая, уточняется через measureElement
    estimateSize: (cardWidth) => cardWidth * 1.5 + 190,
  })

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (items.length === 0) {
    return <EmptyState />
  }

  return (
    <Box ref={containerRef} position="relative" height={`${rowVirtualizer.getTotalSize()}px`}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const startIdx = virtualRow.index * columns
        const rowItems = items.slice(startIdx, startIdx + columns)
        return (
          <Box
            key={virtualRow.key}
            ref={rowVirtualizer.measureElement}
            data-index={virtualRow.index}
            position="absolute"
            top={0}
            left={0}
            right={0}
            transform={`translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`}
          >
            <Grid templateColumns={`repeat(${columns}, 1fr)`} gap={4} alignItems="stretch" pb={4}>
              {rowItems.map((item) => {
                if (item.kind === 'franchise') {
                  const { group } = item
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
                }

                const { anime } = item
                return (
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
                    genres={anime.genreNames}
                    watchStatus={anime.watchStatus}
                    onPlay={onPlay}
                    onExport={onExport}
                    onRefreshMetadata={onRefreshMetadata}
                    onDelete={onDelete}
                    onWatchStatusChange={onWatchStatusChange}
                  />
                )
              })}
            </Grid>
          </Box>
        )
      })}
    </Box>
  )
}
