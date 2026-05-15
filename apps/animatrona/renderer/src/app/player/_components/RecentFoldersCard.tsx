'use client'

/**
 * Карточка с недавно открытыми папками
 * Показывается в режиме выбора файла, когда нет активного видео
 */

import { Box, Card, HStack, Icon, IconButton, Text, VStack } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { memo, useCallback } from 'react'
import { LuFolderOpen, LuTrash2 } from 'react-icons/lu'

import type { FolderHistoryEntry } from '../types'

interface RecentFoldersCardProps {
  /** История папок */
  history: FolderHistoryEntry[]
  /** Обработчик выбора папки */
  onSelectFolder: (folderPath: string) => void
  /** Обработчик удаления из истории */
  onRemoveFolder: (folderPath: string) => void
}

/** Элемент истории папок */
const FolderItem = memo(function FolderItem({
  entry,
  onSelect,
  onRemove,
}: {
  entry: FolderHistoryEntry
  onSelect: () => void
  onRemove: () => void
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect()
      }
    },
    [onSelect]
  )

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onRemove()
    },
    [onRemove]
  )

  return (
    <HStack
      p={2}
      borderRadius="md"
      bg="bg.muted"
      _hover={{ bg: 'state.hover' }}
      cursor="pointer"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <Box flex={1} minW={0}>
        <Text fontSize="sm" fontWeight="medium" lineClamp={1} title={entry.folderName}>
          {entry.folderName}
        </Text>
        <HStack gap={2} fontSize="xs" color="fg.subtle">
          <Text>
            {entry.episodeCount} эпизод{getEpisodeSuffix(entry.episodeCount)}
          </Text>
          <Text>•</Text>
          <Text>
            {formatDistanceToNow(new Date(entry.lastOpenedAt), {
              addSuffix: true,
              locale: ru,
            })}
          </Text>
        </HStack>
      </Box>

      <IconButton aria-label="Удалить из истории" size="xs" variant="ghost" colorPalette="gray" onClick={handleRemove}>
        <Icon as={LuTrash2} />
      </IconButton>
    </HStack>
  )
})

/**
 * Карточка недавних папок
 * Обёрнута в React.memo для предотвращения лишних ререндеров
 */
export const RecentFoldersCard = memo(function RecentFoldersCard({
  history,
  onSelectFolder,
  onRemoveFolder,
}: RecentFoldersCardProps) {
  // Не показываем если история пуста
  if (history.length === 0) {
    return null
  }

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle" maxW="md" w="full">
      <Card.Body>
        <HStack mb={3} gap={2}>
          <Icon as={LuFolderOpen} boxSize={5} color="primary.solid" />
          <Text fontWeight="medium">Недавние папки</Text>
        </HStack>

        <VStack gap={2} align="stretch">
          {history.map((entry) => (
            <FolderItem
              key={entry.folderPath}
              entry={entry}
              onSelect={() => onSelectFolder(entry.folderPath)}
              onRemove={() => onRemoveFolder(entry.folderPath)}
            />
          ))}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
})

/**
 * Получить окончание для слова "эпизод" в зависимости от числа
 */
function getEpisodeSuffix(count: number): string {
  const lastTwo = count % 100
  const lastOne = count % 10

  if (lastTwo >= 11 && lastTwo <= 14) {
    return 'ов'
  }

  if (lastOne === 1) {
    return ''
  }

  if (lastOne >= 2 && lastOne <= 4) {
    return 'а'
  }

  return 'ов'
}
