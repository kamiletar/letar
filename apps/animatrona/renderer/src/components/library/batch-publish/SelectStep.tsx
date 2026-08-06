'use client'

/**
 * Шаг выбора аниме для пакетной публикации
 */

import { Badge, Box, Button, Checkbox, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuFilter, LuGlobe, LuListChecks, LuRefreshCw } from 'react-icons/lu'

import type { WatchStatus } from '@/generated/prisma'

import { WATCH_STATUS_CONFIG } from '../WatchStatusSelector'
import type { BatchAnimeItem, WatchStatusFilter } from './use-batch-publish'

/** Фильтры по статусу */
const STATUS_FILTERS: Array<{ value: WatchStatusFilter; label: string }> = [
  { value: 'ALL', label: 'Все' },
  { value: 'COMPLETED', label: 'Просмотрено' },
  { value: 'WATCHING', label: 'Смотрю' },
  { value: 'ON_HOLD', label: 'Отложено' },
  { value: 'PLANNED', label: 'Запланировано' },
]

interface SelectStepProps {
  filteredAnimes: BatchAnimeItem[]
  selectedIds: Set<string>
  watchStatusFilter: WatchStatusFilter
  onWatchStatusFilterChange: (filter: WatchStatusFilter) => void
  onToggleSelection: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSelectUnpublished: () => void
  onStart: () => void
}

export function SelectStep({
  filteredAnimes,
  selectedIds,
  watchStatusFilter,
  onWatchStatusFilterChange,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onSelectUnpublished,
  onStart,
}: SelectStepProps) {
  const selectedCount = selectedIds.size
  const allSelected = filteredAnimes.length > 0 && filteredAnimes.every((a) => selectedIds.has(a.id))

  return (
    <VStack gap={4} align="stretch">
      {/* Фильтр по статусу */}
      <HStack gap={1} flexWrap="wrap">
        <Icon as={LuFilter} color="fg.muted" boxSize={4} />
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="xs"
            variant={watchStatusFilter === f.value ? 'solid' : 'outline'}
            onClick={() => onWatchStatusFilterChange(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </HStack>

      {/* Кнопки массового выбора */}
      <HStack gap={2}>
        <Button size="xs" variant="ghost" onClick={allSelected ? onDeselectAll : onSelectAll}>
          <Icon as={LuListChecks} mr={1} />
          {allSelected ? 'Снять всё' : 'Выбрать все'}
        </Button>
        <Button size="xs" variant="ghost" onClick={onSelectUnpublished}>
          Только неопубликованные
        </Button>
        <Box flex={1} />
        <Text fontSize="xs" color="fg.muted">
          Выбрано: {selectedCount}
        </Text>
      </HStack>

      {/* Список аниме */}
      <Box maxH="400px" overflowY="auto" borderWidth={1} borderRadius="md">
        {filteredAnimes.length === 0
          ? (
            <Box p={6} textAlign="center">
              <Text color="fg.muted">Нет аниме для публикации</Text>
              <Text fontSize="sm" color="fg.subtle" mt={1}>
                Для публикации нужна IPFS-директория (directoryCid)
              </Text>
            </Box>
          )
          : (
            <VStack gap={0} align="stretch">
              {filteredAnimes.map((anime) => {
                const isSelected = selectedIds.has(anime.id)
                const isPublished = !!anime.trackerPublishedAt
                const needsUpdate = isPublished && anime.trackerPublishedCid !== anime.directoryCid
                const statusConfig = WATCH_STATUS_CONFIG[anime.watchStatus as WatchStatus]

                return (
                  <HStack
                    key={anime.id}
                    px={3}
                    py={2}
                    cursor="pointer"
                    bg={isSelected ? 'colorPalette.subtle' : 'transparent'}
                    _hover={{ bg: isSelected ? 'colorPalette.subtle' : 'bg.subtle' }}
                    onClick={() => onToggleSelection(anime.id)}
                    borderBottomWidth={1}
                    borderColor="border.subtle"
                  >
                    <Checkbox.Root checked={isSelected} onCheckedChange={() => onToggleSelection(anime.id)}>
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>

                    <VStack gap={0} align="start" flex={1} minW={0}>
                      <Text fontSize="sm" fontWeight="medium" truncate>
                        {anime.name}
                      </Text>
                      <HStack gap={2}>
                        {statusConfig && (
                          <Text fontSize="xs" color={statusConfig.color}>
                            {statusConfig.label}
                          </Text>
                        )}
                      </HStack>
                    </VStack>

                    {isPublished && (
                      <Badge size="sm" colorPalette={needsUpdate ? 'orange' : 'green'} variant="subtle">
                        <Icon as={needsUpdate ? LuRefreshCw : LuCheck} boxSize={3} mr={1} />
                        {needsUpdate ? 'Обновить' : 'Опубликовано'}
                      </Badge>
                    )}
                  </HStack>
                )
              })}
            </VStack>
          )}
      </Box>

      {/* Кнопка старта */}
      <Button colorPalette="blue" onClick={onStart} disabled={selectedCount === 0} size="md">
        <Icon as={LuGlobe} mr={2} />
        Опубликовать ({selectedCount})
      </Button>
    </VStack>
  )
}
