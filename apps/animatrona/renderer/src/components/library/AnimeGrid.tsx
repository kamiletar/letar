'use client'

import { AspectRatio, Box, Checkbox, Grid, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { memo, useEffect } from 'react'
import { LuFilm } from 'react-icons/lu'

import type { WatchStatus } from '@/generated/prisma'
import { useVirtualizedGrid } from '@/lib/hooks/use-virtualized-grid'
import { toPlayableUrl } from '@/lib/media-url'

import { AnimeCard } from './AnimeCard'

interface Anime {
  id: string
  name: string
  originalName?: string | null
  year?: number | null
  status: 'ONGOING' | 'COMPLETED' | 'ANNOUNCED'
  episodeCount: number
  rating?: number | null
  poster?: { cid?: string | null } | null
  /** Плоский список названий жанров — стабильная ссылка для React.memo карточки */
  genreNames?: string[]
  /** Статус просмотра */
  watchStatus?: WatchStatus
  /** Контент закреплён локально */
  pinnedLocally?: boolean
  /** Требует перезаливки — раздавалось через утраченный pinner-сервер */
  needsReupload?: boolean
  /** Суммарный размер IPFS контента (байты) */
  totalIpfsSize?: number
  /** Размер по категориям (байты) */
  ipfsSizeBreakdown?: { video: number; audio: number; subtitles: number; fonts: number }
}

interface AnimeGridProps {
  animes: Anime[]
  isLoading?: boolean
  /** Колбэк для продолжения просмотра */
  onPlay?: (id: string) => void
  /** Колбэк для экспорта */
  onExport?: (id: string) => void
  /** Колбэк для обновления метаданных */
  onRefreshMetadata?: (id: string) => void
  /** Колбэк для удаления */
  onDelete?: (id: string) => void
  /** Колбэк для изменения статуса просмотра */
  onWatchStatusChange?: (id: string, status: WatchStatus) => void
  /** Режим множественного выбора */
  selectionMode?: boolean
  /** Выбранные ID */
  selectedIds?: Set<string>
  /** Переключить выбор карточки */
  onToggleSelection?: (id: string) => void
  /** Есть ли ещё не подгруженные страницы (infinite scroll) */
  hasNextPage?: boolean
  /** Идёт подгрузка следующей страницы */
  isFetchingNextPage?: boolean
  /** Подгрузить следующую страницу */
  onLoadMore?: () => void
}

/**
 * Сетка карточек аниме
 * Обёрнута в React.memo для предотвращения лишних ререндеров
 */
export const AnimeGrid = memo(function AnimeGrid({
  animes,
  isLoading,
  onPlay,
  onExport,
  onRefreshMetadata,
  onDelete,
  onWatchStatusChange,
  selectionMode,
  selectedIds,
  onToggleSelection,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: AnimeGridProps) {
  const { containerRef, columns, rowVirtualizer } = useVirtualizedGrid(animes.length, {
    // Постер (2:3) + текстовый блок карточки — грубая оценка, уточняется через measureElement
    estimateSize: (cardWidth) => cardWidth * 1.5 + 170,
  })

  // Infinite scroll: подгружаем следующую страницу, когда виртуализатор приближается
  // к последней уже загруженной строке (не к последней строке экрана — виртуализатор
  // сам знает, что реально отрендерено с учётом overscan)
  const virtualItems = rowVirtualizer.getVirtualItems()
  const lastVirtualItemIndex = virtualItems[virtualItems.length - 1]?.index
  useEffect(() => {
    if (lastVirtualItemIndex === undefined || !hasNextPage || isFetchingNextPage) {
      return
    }
    const rowCount = rowVirtualizer.options.count
    if (lastVirtualItemIndex >= rowCount - 1) {
      onLoadMore?.()
    }
  }, [lastVirtualItemIndex, hasNextPage, isFetchingNextPage, onLoadMore, rowVirtualizer])

  if (isLoading) {
    return (
      <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4} alignItems="start">
        {Array.from({ length: 8 }).map((_, i) => (
          <AspectRatio key={i} ratio={2 / 3}>
            <Box bg="bg.panel" borderRadius="lg" animation="pulse 2s infinite" />
          </AspectRatio>
        ))}
      </Grid>
    )
  }

  if (animes.length === 0) {
    return (
      <Box textAlign="center" py={16} px={4} borderRadius="xl" border="2px dashed" borderColor="border.subtle">
        <VStack gap={4}>
          <Icon as={LuFilm} boxSize={16} color="fg.subtle" />
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

  return (
    <Box ref={containerRef} position="relative" height={`${rowVirtualizer.getTotalSize()}px`}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const startIdx = virtualRow.index * columns
        const rowAnimes = animes.slice(startIdx, startIdx + columns)
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
              {rowAnimes.map((anime) => {
                const isSelected = selectedIds?.has(anime.id) ?? false
                return (
                  <Box
                    key={anime.id}
                    position="relative"
                    onClick={selectionMode ? () => onToggleSelection?.(anime.id) : undefined}
                    cursor={selectionMode ? 'pointer' : undefined}
                  >
                    {/* Чекбокс в режиме выбора */}
                    {selectionMode && (
                      <Box
                        position="absolute"
                        top={2}
                        left={2}
                        zIndex={10}
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleSelection?.(anime.id)
                        }}
                      >
                        <Checkbox.Root checked={isSelected} size="lg">
                          <Checkbox.HiddenInput />
                          <Checkbox.Control
                            bg={isSelected ? 'purple.500' : 'blackAlpha.700'}
                            borderColor={isSelected ? 'purple.500' : 'whiteAlpha.600'}
                            _hover={{ borderColor: 'purple.400' }}
                          />
                        </Checkbox.Root>
                      </Box>
                    )}

                    {/* Подсветка выбранной карточки */}
                    {selectionMode && isSelected && (
                      <Box
                        position="absolute"
                        inset={0}
                        borderRadius="lg"
                        border="2px solid"
                        borderColor="purple.400"
                        zIndex={5}
                        pointerEvents="none"
                      />
                    )}

                    <AnimeCard
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
                      pinnedLocally={anime.pinnedLocally}
                      needsReupload={anime.needsReupload}
                      totalIpfsSize={anime.totalIpfsSize}
                      ipfsSizeBreakdown={anime.ipfsSizeBreakdown}
                      onPlay={selectionMode ? undefined : onPlay}
                      onExport={selectionMode ? undefined : onExport}
                      onRefreshMetadata={selectionMode ? undefined : onRefreshMetadata}
                      onDelete={selectionMode ? undefined : onDelete}
                      onWatchStatusChange={selectionMode ? undefined : onWatchStatusChange}
                    />
                  </Box>
                )
              })}
            </Grid>
          </Box>
        )
      })}
      {isFetchingNextPage && (
        <HStack
          justify="center"
          py={4}
          position="absolute"
          left={0}
          right={0}
          top={`${rowVirtualizer.getTotalSize()}px`}
        >
          <Spinner size="sm" color="purple.500" />
        </HStack>
      )}
    </Box>
  )
})
