'use client'

import { AspectRatio, Box, Checkbox, Grid, Icon, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'
import { LuFilm } from 'react-icons/lu'

import type { WatchStatus } from '@/generated/prisma'
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
  genres?: { genre: { name: string } }[]
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
}: AnimeGridProps) {
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
    <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4} alignItems="stretch">
      {animes.map((anime) => {
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
              genres={anime.genres?.map((g) => g.genre.name)}
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
  )
})
