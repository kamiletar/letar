'use client'

import { Box, Card, HStack, IconButton, Progress, Text, VStack } from '@chakra-ui/react'
import {
  LuArrowDown,
  LuArrowUp,
  LuCheck,
  LuCircleAlert,
  LuClock,
  LuFileVideo,
  LuLoader,
  LuPause,
  LuPlay,
  LuSkipForward,
  LuX,
} from 'react-icons/lu'

import { Tooltip } from '@/components/ui/tooltip'
import { formatBytes, formatSpeed } from '@/lib/format-utils'
import type { QueueItem, QueueItemStatus } from '../../../../shared/types'

interface TranscodeQueueItemProps {
  /** Элемент очереди */
  item: QueueItem
  /** Доступна ли пауза */
  pauseAvailable: boolean
  /** Можно ли переместить вверх */
  canMoveUp: boolean
  /** Можно ли переместить вниз */
  canMoveDown: boolean
  /** Обработчик паузы */
  onPause?: () => void
  /** Обработчик возобновления */
  onResume?: () => void
  /** Обработчик отмены */
  onCancel?: () => void
  /** Обработчик перемещения вверх */
  onMoveUp?: () => void
  /** Обработчик перемещения вниз */
  onMoveDown?: () => void
}

/**
 * Иконка статуса элемента
 */
function StatusIcon({ status }: { status: QueueItemStatus }) {
  switch (status) {
    case 'pending':
      return <LuClock color="var(--chakra-colors-fg-subtle)" size={20} />
    case 'analyzing':
      return <LuLoader color="var(--chakra-colors-blue-400)" size={20} className="animate-spin" />
    case 'ready':
      return <LuFileVideo color="var(--chakra-colors-blue-400)" size={20} />
    case 'transcoding':
      return <LuLoader color="var(--chakra-colors-purple-400)" size={20} className="animate-spin" />
    case 'paused':
      return <LuPause color="var(--chakra-colors-yellow-400)" size={20} />
    case 'completed':
      return <LuCheck color="var(--chakra-colors-green-400)" size={20} />
    case 'cancelled':
      return <LuX color="var(--chakra-colors-fg-subtle)" size={20} />
    case 'error':
      return <LuCircleAlert color="var(--chakra-colors-red-400)" size={20} />
    case 'skipped':
      return <LuSkipForward color="var(--chakra-colors-fg-muted)" size={20} />
  }
}

/**
 * Текст статуса
 */
function getStatusText(status: QueueItemStatus): string {
  switch (status) {
    case 'pending':
      return 'В очереди'
    case 'analyzing':
      return 'Анализ...'
    case 'ready':
      return 'Готов'
    case 'transcoding':
      return 'Транскодирование'
    case 'paused':
      return 'Пауза'
    case 'completed':
      return 'Завершено'
    case 'cancelled':
      return 'Отменено'
    case 'error':
      return 'Ошибка'
    case 'skipped':
      return 'Пропущено'
  }
}

/**
 * Цвет фона карточки в зависимости от статуса
 */
function getCardBg(status: QueueItemStatus): string {
  switch (status) {
    case 'transcoding':
      return 'purple.900'
    case 'paused':
      return 'yellow.900'
    case 'error':
      return 'red.900'
    case 'completed':
      return 'green.900'
    default:
      return 'bg.panel'
  }
}

/**
 * Цвет границы карточки
 */
function getCardBorderColor(status: QueueItemStatus): string {
  switch (status) {
    case 'transcoding':
      return 'purple.700'
    case 'paused':
      return 'yellow.700'
    case 'error':
      return 'red.700'
    case 'completed':
      return 'green.700'
    default:
      return 'border.subtle'
  }
}

/**
 * Элемент очереди транскодирования с контролами
 */
export function TranscodeQueueItem({
  item,
  pauseAvailable,
  canMoveUp,
  canMoveDown,
  onPause,
  onResume,
  onCancel,
  onMoveUp,
  onMoveDown,
}: TranscodeQueueItemProps) {
  const isActive = item.status === 'transcoding' || item.status === 'analyzing'
  const isPaused = item.status === 'paused'
  const isPending = item.status === 'pending' || item.status === 'ready'
  const canPause = isActive && pauseAvailable
  const canResume = isPaused
  const canReorder = isPending

  return (
    <Card.Root bg={getCardBg(item.status)} border="1px" borderColor={getCardBorderColor(item.status)}>
      <Card.Body py={3} px={4}>
        <HStack gap={4}>
          {/* Иконка статуса */}
          <Box p={2} borderRadius="md" bg="blackAlpha.300">
            <StatusIcon status={item.status} />
          </Box>

          {/* Информация о файле */}
          <VStack align="start" flex={1} gap={1}>
            <HStack justify="space-between" w="full">
              <Text fontWeight="medium" lineClamp={1}>
                {item.fileName}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {getStatusText(item.status)}
              </Text>
            </HStack>

            {/* Прогресс и статистика */}
            {isActive && item.progress && (
              <VStack w="full" gap={1} align="stretch">
                <HStack gap={4}>
                  <Progress.Root value={item.progress.percent || 0} size="sm" flex={1}>
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  <Text fontSize="sm" w="50px" textAlign="right">
                    {(item.progress.percent || 0).toFixed(0)}%
                  </Text>
                </HStack>
                <HStack gap={4} fontSize="xs" color="fg.muted">
                  {item.progress.fps && <Text>{item.progress.fps.toFixed(0)} fps</Text>}
                  {item.progress.speed && <Text>{formatSpeed(item.progress.speed)}</Text>}
                  {item.progress.outputSize && <Text>{formatBytes(item.progress.outputSize)}</Text>}
                </HStack>
              </VStack>
            )}

            {/* Пауза — показываем прогресс на момент паузы */}
            {isPaused && item.progress && (
              <HStack gap={4}>
                <Progress.Root value={item.progress.percent || 0} size="sm" flex={1}>
                  <Progress.Track bg="yellow.800">
                    <Progress.Range bg="yellow.500" />
                  </Progress.Track>
                </Progress.Root>
                <Text fontSize="sm" w="50px" textAlign="right" color="yellow.400">
                  {(item.progress.percent || 0).toFixed(0)}%
                </Text>
              </HStack>
            )}

            {/* Ошибка */}
            {item.status === 'error' && item.error && (
              <Text fontSize="sm" color="red.300" lineClamp={2}>
                {item.error}
              </Text>
            )}
          </VStack>

          {/* Контролы */}
          <HStack gap={1}>
            {/* Переместить вверх */}
            {canReorder && canMoveUp && (
              <Tooltip content="Переместить вверх">
                <IconButton aria-label="Переместить вверх" size="sm" variant="ghost" onClick={onMoveUp}>
                  <LuArrowUp />
                </IconButton>
              </Tooltip>
            )}

            {/* Переместить вниз */}
            {canReorder && canMoveDown && (
              <Tooltip content="Переместить вниз">
                <IconButton aria-label="Переместить вниз" size="sm" variant="ghost" onClick={onMoveDown}>
                  <LuArrowDown />
                </IconButton>
              </Tooltip>
            )}

            {/* Пауза */}
            {canPause && (
              <Tooltip content="Приостановить">
                <IconButton
                  aria-label="Приостановить"
                  size="sm"
                  variant="ghost"
                  colorPalette="yellow"
                  onClick={onPause}
                >
                  <LuPause />
                </IconButton>
              </Tooltip>
            )}

            {/* Возобновить */}
            {canResume && (
              <Tooltip content="Возобновить">
                <IconButton aria-label="Возобновить" size="sm" variant="ghost" colorPalette="green" onClick={onResume}>
                  <LuPlay />
                </IconButton>
              </Tooltip>
            )}

            {/* Отменить */}
            {(isActive || isPaused || isPending) && (
              <Tooltip content="Отменить">
                <IconButton aria-label="Отменить" size="sm" variant="ghost" colorPalette="red" onClick={onCancel}>
                  <LuX />
                </IconButton>
              </Tooltip>
            )}
          </HStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
