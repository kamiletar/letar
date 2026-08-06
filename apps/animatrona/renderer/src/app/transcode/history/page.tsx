'use client'

/**
 * Страница истории импортов
 *
 * Показывает список завершённых импортов с:
 * - Статистикой (время, VMAF, CQ)
 * - Возможностью удаления
 * - Фильтрацией по статусу и поиску
 */

import {
  Badge,
  Box,
  Button,
  Card,
  EmptyState,
  Flex,
  Heading,
  HStack,
  IconButton,
  Image,
  Input,
  SegmentGroup,
  Skeleton,
  Stat,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LuArrowLeft,
  LuCalendar,
  LuCheck,
  LuCircleX,
  LuClock,
  LuCpu,
  LuHardDrive,
  LuHistory,
  LuMonitor,
  LuSearch,
  LuTarget,
  LuTrash2,
  LuX,
} from 'react-icons/lu'

import { Header } from '@/components/layout'
import { Tooltip } from '@/components/ui/tooltip'

import type { ImportHistoryEntry, ImportHistoryStats } from '../../../../../shared/types/import-history'

/** Форматирует дату */
function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Форматирует длительность */
function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 60) {
    return `${sec}с`
  }
  const min = Math.floor(sec / 60)
  const secRem = sec % 60
  if (min < 60) {
    return `${min}м ${secRem}с`
  }
  const hours = Math.floor(min / 60)
  const minRem = min % 60
  return `${hours}ч ${minRem}м`
}

/** Форматирует размер файла */
function formatSize(bytes?: number): string {
  if (!bytes) {
    return '—'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** Цвета для статусов */
const statusColors: Record<string, string> = {
  completed: 'green',
  error: 'red',
  cancelled: 'gray',
}

/** Лейблы для статусов */
const statusLabels: Record<string, string> = {
  completed: 'Успешно',
  error: 'Ошибка',
  cancelled: 'Отменён',
}

export default function HistoryPage() {
  const [history, setHistory] = useState<ImportHistoryEntry[]>([])
  const [stats, setStats] = useState<ImportHistoryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'error'>('all')
  const [search, setSearch] = useState('')

  // Загрузка данных
  const loadData = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    setIsLoading(true)
    try {
      const [historyResult, statsResult] = await Promise.all([api.history.getAll(), api.history.getStats()])

      if (historyResult.success && historyResult.data) {
        setHistory(historyResult.data)
      }
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Фильтрованные записи
  const filteredHistory = useMemo(() => {
    let result = history

    // Фильтр по статусу
    if (filter === 'completed') {
      result = result.filter((h) => h.status === 'completed')
    } else if (filter === 'error') {
      result = result.filter((h) => h.status === 'error' || h.status === 'cancelled')
    }

    // Поиск
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (h) => h.animeName.toLowerCase().includes(searchLower) || h.animeNameRu?.toLowerCase().includes(searchLower),
      )
    }

    return result
  }, [history, filter, search])

  // Удаление записи
  const handleDelete = async (id: string) => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    const result = await api.history.delete(id)
    if (result.success) {
      setHistory((prev) => prev.filter((h) => h.id !== id))
    }
  }

  // Очистка истории
  const handleClear = async () => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    const result = await api.history.clear()
    if (result.success) {
      setHistory([])
      loadData() // Обновим статистику
    }
  }

  return (
    <Box minH="100vh" bg="bg">
      <Header title="История импортов" />

      <Box p={6}>
        <VStack gap={6} align="stretch">
          {/* Шапка */}
          <Flex justify="space-between" align="center">
            <HStack gap={3}>
              <Button variant="ghost" size="sm" asChild>
                <a href="/transcode">
                  <LuArrowLeft />
                  Назад
                </a>
              </Button>
              <Heading size="lg">История импортов</Heading>
            </HStack>
            {history.length > 0 && (
              <Button size="sm" variant="outline" colorPalette="red" onClick={handleClear}>
                <LuTrash2 />
                Очистить
              </Button>
            )}
          </Flex>

          {/* Статистика */}
          {stats && (
            <HStack gap={4} wrap="wrap">
              <Stat.Root size="sm">
                <Stat.Label>Всего импортов</Stat.Label>
                <Stat.ValueText>{stats.totalImports}</Stat.ValueText>
              </Stat.Root>
              <Stat.Root size="sm">
                <Stat.Label>Успешных</Stat.Label>
                <Stat.ValueText color="green.500">{stats.successfulImports}</Stat.ValueText>
              </Stat.Root>
              <Stat.Root size="sm">
                <Stat.Label>С ошибками</Stat.Label>
                <Stat.ValueText color="red.500">{stats.failedImports}</Stat.ValueText>
              </Stat.Root>
              <Stat.Root size="sm">
                <Stat.Label>Среднее время</Stat.Label>
                <Stat.ValueText>{formatDuration(stats.avgDurationMs)}</Stat.ValueText>
              </Stat.Root>
              {stats.avgVmafScore && (
                <Stat.Root size="sm">
                  <Stat.Label>Средний VMAF</Stat.Label>
                  <Stat.ValueText>{stats.avgVmafScore}</Stat.ValueText>
                </Stat.Root>
              )}
              <Stat.Root size="sm">
                <Stat.Label>Общий размер</Stat.Label>
                <Stat.ValueText>{formatSize(stats.totalSizeBytes)}</Stat.ValueText>
              </Stat.Root>
            </HStack>
          )}

          {/* Фильтры */}
          <Flex gap={4} wrap="wrap" align="center">
            <SegmentGroup.Root
              size="sm"
              value={filter}
              onValueChange={(e) => setFilter(e.value as 'all' | 'completed' | 'error')}
            >
              <SegmentGroup.Indicator />
              <SegmentGroup.Items
                items={[
                  { value: 'all', label: 'Все' },
                  { value: 'completed', label: 'Успешные' },
                  { value: 'error', label: 'С ошибками' },
                ]}
              />
            </SegmentGroup.Root>

            <Box position="relative" flex={1} maxW="300px">
              <Input
                placeholder="Поиск по названию..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                pl={10}
              />
              <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted">
                <LuSearch size={16} />
              </Box>
            </Box>
          </Flex>

          {/* Список */}
          {isLoading
            ? (
              <VStack gap={3}>
                {[1, 2, 3].map((i) => <Skeleton key={i} height="100px" borderRadius="lg" />)}
              </VStack>
            )
            : filteredHistory.length === 0
            ? (
              <EmptyState.Root>
                <EmptyState.Content>
                  <EmptyState.Indicator>
                    <LuHistory />
                  </EmptyState.Indicator>
                  <EmptyState.Title>История пуста</EmptyState.Title>
                  <EmptyState.Description>
                    {search ? 'Ничего не найдено по запросу' : 'Завершённые импорты будут отображаться здесь'}
                  </EmptyState.Description>
                </EmptyState.Content>
              </EmptyState.Root>
            )
            : (
              <VStack gap={3} align="stretch">
                {filteredHistory.map((entry) => (
                  <Card.Root key={entry.id} size="sm">
                    <Card.Body>
                      <Flex gap={4} align="flex-start">
                        {/* Постер */}
                        {entry.posterUrl
                          ? (
                            <Image
                              src={entry.posterUrl}
                              alt={entry.animeName}
                              width="60px"
                              height="85px"
                              borderRadius="md"
                              objectFit="cover"
                              flexShrink={0}
                            />
                          )
                          : <Box width="60px" height="85px" borderRadius="md" bg="bg.subtle" flexShrink={0} />}

                        {/* Информация */}
                        <VStack align="stretch" flex={1} gap={2}>
                          <Flex justify="space-between" align="flex-start">
                            <VStack align="start" gap={0}>
                              <HStack gap={2}>
                                <Text fontWeight="medium">{entry.animeNameRu || entry.animeName}</Text>
                                <Badge colorPalette={statusColors[entry.status]} size="sm">
                                  {entry.status === 'completed' && <LuCheck />}
                                  {entry.status === 'error' && <LuCircleX />}
                                  {entry.status === 'cancelled' && <LuX />}
                                  {statusLabels[entry.status]}
                                </Badge>
                              </HStack>
                              {entry.animeNameRu && (
                                <Text fontSize="sm" color="fg.muted">
                                  {entry.animeName}
                                </Text>
                              )}
                            </VStack>
                            <Tooltip content="Удалить из истории">
                              <IconButton
                                aria-label="Удалить"
                                variant="ghost"
                                size="xs"
                                colorPalette="red"
                                onClick={() => handleDelete(entry.id)}
                              >
                                <LuTrash2 />
                              </IconButton>
                            </Tooltip>
                          </Flex>

                          {/* Метрики */}
                          <HStack gap={4} wrap="wrap" fontSize="sm" color="fg.muted">
                            <HStack gap={1}>
                              <LuCalendar size={14} />
                              <Text>{formatDate(entry.completedAt)}</Text>
                            </HStack>
                            <HStack gap={1}>
                              <LuClock size={14} />
                              <Text>{formatDuration(entry.durationMs)}</Text>
                            </HStack>
                            <HStack gap={1}>
                              <LuHardDrive size={14} />
                              <Text>{entry.episodesCount} эп.</Text>
                            </HStack>
                            {entry.vmafScore && (
                              <HStack gap={1}>
                                <LuTarget size={14} />
                                <Text>VMAF {entry.vmafScore}</Text>
                              </HStack>
                            )}
                            {entry.cqValue && (
                              <HStack gap={1}>
                                <LuMonitor size={14} />
                                <Text>CQ {entry.cqValue}</Text>
                              </HStack>
                            )}
                            {entry.usedCpuFallback && (
                              <Badge colorPalette="blue" size="sm">
                                <LuCpu size={12} />
                                CPU
                              </Badge>
                            )}
                          </HStack>

                          {/* Ошибка */}
                          {entry.errorMessage && (
                            <Text fontSize="sm" color="red.400">
                              {entry.errorMessage}
                            </Text>
                          )}
                        </VStack>
                      </Flex>
                    </Card.Body>
                  </Card.Root>
                ))}
              </VStack>
            )}
        </VStack>
      </Box>
    </Box>
  )
}
