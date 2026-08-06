'use client'

/**
 * ExportQueuePanel — сворачиваемая панель очереди экспорта
 */

import {
  Box,
  Button,
  Collapsible,
  Flex,
  HStack,
  Icon,
  IconButton,
  Progress,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import {
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuDownload,
  LuPause,
  LuPlay,
  LuRefreshCw,
  LuTrash2,
  LuX,
} from 'react-icons/lu'

import type { ExportTask, ExportTaskStatus } from '../../../../shared/types/export-queue'

import { useExportQueue } from '../../hooks/useExportQueue'

/** Цвет статуса */
const STATUS_COLORS: Record<ExportTaskStatus, string> = {
  pending: 'gray',
  fetching: 'blue',
  encoding: 'purple',
  completed: 'green',
  failed: 'red',
  cancelled: 'gray',
  paused: 'yellow',
}

/** Текст статуса */
const STATUS_TEXT: Record<ExportTaskStatus, string> = {
  pending: 'В очереди',
  fetching: 'Загрузка',
  encoding: 'Кодирование',
  completed: 'Готово',
  failed: 'Ошибка',
  cancelled: 'Отменено',
  paused: 'Пауза',
}

/** Иконка статуса */
function StatusIcon({ status }: { status: ExportTaskStatus }) {
  switch (status) {
    case 'completed':
      return <Icon as={LuCheck} color="green.500" />
    case 'failed':
      return <Icon as={LuX} color="red.500" />
    case 'fetching':
      return <Icon as={LuDownload} color="blue.500" />
    case 'encoding':
      return <Icon as={LuRefreshCw} color="purple.500" className="animate-spin" />
    case 'paused':
      return <Icon as={LuPause} color="yellow.500" />
    default:
      return null
  }
}

/** Карточка задачи экспорта */
function ExportTaskCard({
  task,
  onCancel,
  onPause,
  onResume,
  onRetry,
}: {
  task: ExportTask
  onCancel: () => void
  onPause: () => void
  onResume: () => void
  onRetry: () => void
}) {
  const isActive = task.status === 'fetching' || task.status === 'encoding'
  const canPause = task.status === 'pending' || isActive
  const canResume = task.status === 'paused'
  const canRetry = task.status === 'failed' || task.status === 'cancelled'
  const canCancel = task.status !== 'completed' && task.status !== 'cancelled'

  // Общий прогресс (fetch + encode)
  const totalProgress = task.progress.totalEpisodes > 0
    ? ((task.progress.currentEpisode - 1) / task.progress.totalEpisodes) * 100
      + (task.progress.fetchProgress * 0.3 + task.progress.encodeProgress * 0.7) / task.progress.totalEpisodes
    : 0

  return (
    <Box p={3} borderWidth="1px" borderRadius="md" bg="bg.subtle" _hover={{ bg: 'bg.muted' }}>
      <Flex justify="space-between" align="start" mb={2}>
        <VStack align="start" gap={0}>
          <HStack>
            <StatusIcon status={task.status} />
            <Text fontWeight="medium" fontSize="sm">
              {task.animeName}
            </Text>
          </HStack>
          <Text fontSize="xs" color="fg.muted">
            {task.episodes.length} эп. • {STATUS_TEXT[task.status]}
            {task.progress.eta && ` • ${task.progress.eta}`}
          </Text>
        </VStack>

        <HStack gap={1}>
          {canPause && (
            <IconButton aria-label="Пауза" size="xs" variant="ghost" onClick={onPause}>
              <LuPause />
            </IconButton>
          )}
          {canResume && (
            <IconButton aria-label="Продолжить" size="xs" variant="ghost" onClick={onResume}>
              <LuPlay />
            </IconButton>
          )}
          {canRetry && (
            <IconButton aria-label="Повторить" size="xs" variant="ghost" onClick={onRetry}>
              <LuRefreshCw />
            </IconButton>
          )}
          {canCancel && (
            <IconButton aria-label="Отменить" size="xs" variant="ghost" colorPalette="red" onClick={onCancel}>
              <LuX />
            </IconButton>
          )}
        </HStack>
      </Flex>

      {isActive && (
        <Box>
          <Progress.Root value={totalProgress} size="xs" colorPalette={STATUS_COLORS[task.status]}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Flex justify="space-between" mt={1}>
            <Text fontSize="xs" color="fg.muted">
              Эпизод {task.progress.currentEpisode}/{task.progress.totalEpisodes}
            </Text>
            {task.progress.speed && (
              <Text fontSize="xs" color="fg.muted">
                {task.progress.speed}
              </Text>
            )}
          </Flex>
        </Box>
      )}

      {task.status === 'failed' && task.error && (
        <Text fontSize="xs" color="red.500" mt={2}>
          {task.error}
        </Text>
      )}
    </Box>
  )
}

/**
 * Панель очереди экспорта
 */
export function ExportQueuePanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { tasks, activeCount, pendingCount, cancelTask, pauseTask, resumeTask, retryTask, clearCompleted } =
    useExportQueue()

  const handleClearCompleted = useCallback(async () => {
    await clearCompleted()
  }, [clearCompleted])

  // Не показывать панель если нет задач
  if (tasks.length === 0) {
    return null
  }

  const completedCount = tasks.filter(
    (t) => t.status === 'completed' || t.status === 'cancelled' || t.status === 'failed',
  ).length

  return (
    <Box position="fixed" bottom={0} left={0} right={0} bg="bg.panel" borderTopWidth="1px" shadow="lg" zIndex={1000}>
      {/* Заголовок (всегда видим) */}
      <Flex
        px={4}
        py={2}
        justify="space-between"
        align="center"
        cursor="pointer"
        onClick={() =>
          setIsExpanded(!isExpanded)}
        _hover={{ bg: 'bg.subtle' }}
      >
        <HStack>
          <Icon as={LuDownload} />
          <Text fontWeight="medium">Очередь экспорта</Text>
          {activeCount > 0 && (
            <Box px={2} py={0.5} borderRadius="full" bg="blue.500" color="white" fontSize="xs">
              {activeCount} активных
            </Box>
          )}
          {pendingCount > 0 && (
            <Box px={2} py={0.5} borderRadius="full" bg="gray.500" color="white" fontSize="xs">
              {pendingCount} в очереди
            </Box>
          )}
        </HStack>

        <HStack>
          {completedCount > 0 && (
            <Button
              size="xs"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                handleClearCompleted()
              }}
            >
              <LuTrash2 />
              Очистить ({completedCount})
            </Button>
          )}
          <Icon as={isExpanded ? LuChevronDown : LuChevronUp} />
        </HStack>
      </Flex>

      {/* Содержимое (сворачиваемое) */}
      <Collapsible.Root open={isExpanded}>
        <Collapsible.Content>
          <Box px={4} pb={4} maxH="300px" overflowY="auto">
            <Stack gap={2}>
              {tasks.map((task) => (
                <ExportTaskCard
                  key={task.id}
                  task={task}
                  onCancel={() => cancelTask(task.id)}
                  onPause={() =>
                    pauseTask(task.id)}
                  onResume={() =>
                    resumeTask(task.id)}
                  onRetry={() =>
                    retryTask(task.id)}
                />
              ))}
            </Stack>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  )
}
