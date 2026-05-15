'use client'

/**
 * Компактный элемент очереди импорта
 *
 * Отображает в одну строку:
 * [🔵 Status] Название (12 эп.) [████░░ 75%] [🔄 🗑️]
 */

import { Badge, Button, HStack, Icon, Progress, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { LuCheck, LuClock, LuLoader, LuPencil, LuPlay, LuRefreshCw, LuTrash2, LuX, LuZap } from 'react-icons/lu'

import type { ImportQueueEntry, ImportQueueStatus } from '../../../../shared/types/import-queue'

interface CompactQueueItemProps {
  /** Элемент очереди */
  item: ImportQueueEntry
  /** Callback удаления */
  onRemove: () => void
  /** Callback повторной обработки */
  onRetry?: (itemId: string, options?: { skipCompressionCheck?: boolean }) => void
  /** Callback редактирования */
  onEdit?: () => void
  /** Элемент в фокусе (keyboard navigation) */
  isFocused?: boolean
  /** Callback при фокусе */
  onFocus?: () => void
}

/** Цвет бейджа статуса */
const statusColors: Record<ImportQueueStatus, string> = {
  pending: 'gray',
  vmaf: 'yellow',
  preparing: 'blue',
  transcoding: 'purple',
  postprocess: 'cyan',
  completed: 'green',
  error: 'red',
  cancelled: 'orange',
}

/** Иконка статуса */
const statusIcons: Record<ImportQueueStatus, typeof LuClock> = {
  pending: LuClock,
  vmaf: LuZap,
  preparing: LuLoader,
  transcoding: LuPlay,
  postprocess: LuLoader,
  completed: LuCheck,
  error: LuX,
  cancelled: LuX,
}

/** Короткие названия статусов */
const statusLabels: Record<ImportQueueStatus, string> = {
  pending: 'Ожидает',
  vmaf: 'VMAF',
  preparing: 'Подготовка',
  transcoding: 'Кодирование',
  postprocess: 'Обработка',
  completed: 'Готово',
  error: 'Ошибка',
  cancelled: 'Отменён',
}

/**
 * Компактный элемент очереди
 */
export const CompactQueueItem = memo(function CompactQueueItem({
  item,
  onRemove,
  onRetry,
  onEdit,
  isFocused,
  onFocus,
}: CompactQueueItemProps) {
  const StatusIcon = statusIcons[item.status]
  const isFinished = ['completed', 'error', 'cancelled'].includes(item.status)
  const selectedFilesCount = item.files.filter((f) => f.selected).length
  const animeName = item.selectedAnime.russian || item.selectedAnime.name
  const progress = item.progress ?? 0

  return (
    <HStack
      p={2}
      bg="bg.panel"
      border="1px"
      borderColor={isFocused ? 'purple.500' : 'border.subtle'}
      borderRadius="md"
      gap={3}
      role="listitem"
      tabIndex={isFocused ? 0 : -1}
      onClick={onFocus}
      outline={isFocused ? '2px solid' : 'none'}
      outlineColor="purple.500"
      outlineOffset="2px"
      _hover={{ borderColor: isFocused ? 'purple.500' : 'border.emphasized' }}
    >
      {/* Статус */}
      <Badge colorPalette={statusColors[item.status]} variant="subtle" flexShrink={0}>
        <Icon as={StatusIcon} boxSize={3} mr={1} />
        {statusLabels[item.status]}
      </Badge>

      {/* Название и кол-во эпизодов */}
      <Text flex={1} fontSize="sm" lineClamp={1} title={animeName}>
        {animeName}
        <Text as="span" color="fg.muted" ml={1}>
          ({selectedFilesCount} эп.)
        </Text>
      </Text>

      {/* Прогресс (если есть) */}
      {!isFinished && progress > 0 && (
        <HStack gap={2} flexShrink={0} w="120px">
          <Progress.Root value={progress} size="sm" flex={1}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Text fontSize="xs" color="fg.muted" w="35px" textAlign="right">
            {progress.toFixed(0)}%
          </Text>
        </HStack>
      )}

      {/* Кнопки */}
      <HStack gap={0} flexShrink={0}>
        {/* Редактировать (pending) */}
        {item.status === 'pending' && onEdit && (
          <Button size="xs" variant="ghost" onClick={onEdit} aria-label="Редактировать">
            <Icon as={LuPencil} boxSize={3} />
          </Button>
        )}

        {/* Повторить (error/cancelled) */}
        {(item.status === 'error' || item.status === 'cancelled') && onRetry && (
          <Button
            size="xs"
            variant="ghost"
            colorPalette="green"
            onClick={() => onRetry(item.id)}
            aria-label="Повторить"
          >
            <Icon as={LuRefreshCw} boxSize={3} />
          </Button>
        )}

        {/* Удалить */}
        {(item.status === 'pending' || isFinished) && (
          <Button size="xs" variant="ghost" colorPalette="red" onClick={onRemove} aria-label="Удалить">
            <Icon as={LuTrash2} boxSize={3} />
          </Button>
        )}
      </HStack>
    </HStack>
  )
})
