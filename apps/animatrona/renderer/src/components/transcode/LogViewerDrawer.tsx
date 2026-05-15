'use client'

/**
 * LogViewerDrawer — просмотр логов FFmpeg в реальном времени
 *
 * Функции:
 * - Отображение логов в monospace шрифте
 * - Фильтрация по уровню (info/warning/error)
 * - Auto-scroll вниз (с toggle)
 * - Кнопка "Скопировать всё"
 * - Real-time обновление через IPC события
 *
 * Защита от утечек памяти:
 * - Логи НЕ загружаются пока drawer закрыт
 * - Circular buffer в main process (500 строк max)
 */

import {
  Badge,
  Box,
  Button,
  ClipboardRoot,
  ClipboardTrigger,
  Drawer,
  Flex,
  HStack,
  IconButton,
  SegmentGroup,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuArrowDownToLine, LuClipboard, LuFilter, LuRefreshCw, LuTerminal, LuTrash2, LuX } from 'react-icons/lu'

/** Тип записи лога */
export interface LogEntry {
  timestamp: number
  taskId: string
  level: 'info' | 'warning' | 'error'
  message: string
}

interface LogViewerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Фильтр по taskId (опционально) */
  taskId?: string
}

/** Цвета для разных уровней логов */
const levelColors: Record<string, string> = {
  info: 'gray.400',
  warning: 'yellow.400',
  error: 'red.400',
}

/** Форматирует timestamp в читаемое время */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const LogViewerDrawer = memo(function LogViewerDrawer({ open, onOpenChange, taskId }: LogViewerDrawerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'warning' | 'error'>('all')
  const [selectedTask, setSelectedTask] = useState<string | null>(null) // null = все задачи
  const [autoScroll, setAutoScroll] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Уникальные taskId для вкладок
  const uniqueTasks = useMemo(() => {
    const taskIds = new Set<string>()
    for (const log of logs) {
      taskIds.add(log.taskId)
    }
    return Array.from(taskIds)
  }, [logs])

  // Загрузка логов при открытии drawer
  const loadLogs = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    setIsLoading(true)
    try {
      const result = taskId
        ? await api.parallelTranscode.getVideoTaskLogs(taskId)
        : await api.parallelTranscode.getVideoLogs()

      if (result.success && result.data) {
        setLogs(result.data)
      }
    } catch (error) {
      console.error('[LogViewer] Failed to load logs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  // Загружаем логи при открытии
  useEffect(() => {
    if (open) {
      loadLogs()
    } else {
      // Очищаем локальное состояние при закрытии (память)
      setLogs([])
      setSelectedTask(null)
    }
  }, [open, loadLogs])

  // Подписка на real-time обновления
  useEffect(() => {
    if (!open) {
      return
    }

    const api = window.electronAPI
    if (!api) {
      return
    }

    const unsubscribe = api.parallelTranscode.onVideoLogEntry((entryTaskId, entry) => {
      // Фильтруем по taskId если указан
      if (taskId && entryTaskId !== taskId) {
        return
      }

      setLogs((prev) => [
        ...prev,
        {
          timestamp: entry.timestamp,
          taskId: entryTaskId,
          level: entry.level,
          message: entry.message,
        },
      ])
    })

    return unsubscribe
  }, [open, taskId])

  // Auto-scroll при добавлении новых логов
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Фильтрованные логи (по задаче и уровню)
  const filteredLogs = useMemo(() => {
    let result = logs

    // Фильтр по задаче
    if (selectedTask) {
      result = result.filter((l) => l.taskId === selectedTask)
    }

    // Фильтр по уровню
    if (filter === 'warning') {
      result = result.filter((l) => l.level === 'warning' || l.level === 'error')
    } else if (filter === 'error') {
      result = result.filter((l) => l.level === 'error')
    }

    return result
  }, [logs, filter, selectedTask])

  // Текст для копирования
  const logsText = useMemo(() => {
    return filteredLogs.map((l) => `[${formatTime(l.timestamp)}] [${l.level.toUpperCase()}] ${l.message}`).join('\n')
  }, [filteredLogs])

  // Очистка логов
  const handleClear = async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    await api.parallelTranscode.clearVideoLogs()
    setLogs([])
    setSelectedTask(null)
  }

  // Счётчики по уровням
  const counts = useMemo(() => {
    const result = { all: logs.length, warning: 0, error: 0 }
    for (const log of logs) {
      if (log.level === 'warning') {
        result.warning++
      }
      if (log.level === 'error') {
        result.error++
      }
    }
    return result
  }, [logs])

  return (
    <Drawer.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="end" size="lg">
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content>
          <Drawer.Header borderBottomWidth="1px">
            <HStack justify="space-between" width="100%">
              <HStack gap={2}>
                <LuTerminal />
                <Drawer.Title>FFmpeg Logs</Drawer.Title>
                <Badge colorPalette="gray" size="sm">
                  {filteredLogs.length}
                </Badge>
              </HStack>
              <HStack gap={1}>
                <IconButton aria-label="Обновить" variant="ghost" size="sm" onClick={loadLogs} loading={isLoading}>
                  <LuRefreshCw />
                </IconButton>
                <IconButton aria-label="Очистить" variant="ghost" size="sm" colorPalette="red" onClick={handleClear}>
                  <LuTrash2 />
                </IconButton>
                <Drawer.CloseTrigger asChild>
                  <IconButton aria-label="Закрыть" variant="ghost" size="sm">
                    <LuX />
                  </IconButton>
                </Drawer.CloseTrigger>
              </HStack>
            </HStack>
          </Drawer.Header>

          <Drawer.Body p={0} display="flex" flexDirection="column" overflow="hidden">
            {/* Вкладки по задачам (показываем только если больше 1 задачи) */}
            {uniqueTasks.length > 1 && (
              <Tabs.Root
                value={selectedTask ?? 'all'}
                onValueChange={(e) => setSelectedTask(e.value === 'all' ? null : e.value)}
                size="sm"
                variant="line"
                flexShrink={0}
              >
                <Tabs.List px={4} pt={2} bg="bg.subtle" overflowX="auto">
                  <Tabs.Trigger value="all">Все ({logs.length})</Tabs.Trigger>
                  {uniqueTasks.map((tid, index) => (
                    <Tabs.Trigger key={tid} value={tid}>
                      Задача {index + 1} ({logs.filter((l) => l.taskId === tid).length})
                    </Tabs.Trigger>
                  ))}
                  <Tabs.Indicator />
                </Tabs.List>
              </Tabs.Root>
            )}

            {/* Панель фильтров */}
            <Flex
              px={4}
              py={2}
              borderBottomWidth="1px"
              bg="bg.subtle"
              justify="space-between"
              align="center"
              flexShrink={0}
            >
              <HStack gap={2}>
                <LuFilter size={14} />
                <SegmentGroup.Root
                  size="sm"
                  value={filter}
                  onValueChange={(e) => setFilter(e.value as 'all' | 'warning' | 'error')}
                >
                  <SegmentGroup.Indicator />
                  <SegmentGroup.Items
                    items={[
                      { value: 'all', label: `Все (${counts.all})` },
                      { value: 'warning', label: `Warn (${counts.warning})` },
                      { value: 'error', label: `Errors (${counts.error})` },
                    ]}
                  />
                </SegmentGroup.Root>
              </HStack>

              <HStack gap={2}>
                <Button
                  size="xs"
                  variant={autoScroll ? 'solid' : 'outline'}
                  colorPalette={autoScroll ? 'blue' : 'gray'}
                  onClick={() => setAutoScroll(!autoScroll)}
                >
                  <LuArrowDownToLine />
                  Auto-scroll
                </Button>
                <ClipboardRoot value={logsText}>
                  <ClipboardTrigger asChild>
                    <Button size="xs" variant="outline">
                      <LuClipboard />
                      Копировать
                    </Button>
                  </ClipboardTrigger>
                </ClipboardRoot>
              </HStack>
            </Flex>

            {/* Логи */}
            <Box
              ref={scrollRef}
              flex={1}
              overflow="auto"
              fontFamily="mono"
              fontSize="xs"
              lineHeight="1.6"
              bg="gray.950"
              color="gray.300"
              p={3}
            >
              {filteredLogs.length === 0 ? (
                <VStack py={8} color="gray.500">
                  <LuTerminal size={32} />
                  <Text>Нет логов</Text>
                  <Text fontSize="xs" color="gray.600">
                    Логи появятся при транскодировании
                  </Text>
                </VStack>
              ) : (
                filteredLogs.map((log, index) => (
                  <Box
                    key={`${log.timestamp}-${index}`}
                    py={0.5}
                    borderBottomWidth="1px"
                    borderColor="whiteAlpha.100"
                    _last={{ borderBottom: 'none' }}
                  >
                    <HStack gap={2} align="flex-start">
                      <Text color="gray.600" flexShrink={0} whiteSpace="nowrap">
                        {formatTime(log.timestamp)}
                      </Text>
                      <Text
                        color={levelColors[log.level]}
                        flexShrink={0}
                        fontWeight="medium"
                        textTransform="uppercase"
                        minW="50px"
                      >
                        {log.level}
                      </Text>
                      <Text
                        color={log.level === 'error' ? 'red.300' : log.level === 'warning' ? 'yellow.300' : 'gray.300'}
                        wordBreak="break-word"
                      >
                        {log.message}
                      </Text>
                    </HStack>
                  </Box>
                ))
              )}
            </Box>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  )
})
