'use client'

import { Badge, Box, Button, HStack, Icon, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuChevronDown, LuHistory } from 'react-icons/lu'

/** Запись лога модерации */
interface LogEntry {
  id: string
  action: string
  animeId: string
  animeTitle: string
  details: string | null
  createdAt: string
  moderator: {
    id: string
    name: string | null
    image: string | null
  }
}

/** Форматирование действия модерации */
function actionLabel(action: string): { text: string; color: string } {
  switch (action) {
    case 'approve': {
      return { text: 'Одобрено', color: 'green' }
    }
    case 'reject': {
      return { text: 'Отклонено', color: 'red' }
    }
    case 'approve_replacement': {
      return { text: 'Замена', color: 'orange' }
    }
    default: {
      return { text: action, color: 'gray' }
    }
  }
}

/** Форматирование даты */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Структура деталей лога */
interface LogDetails {
  replacedAnimeId?: string
  previousStatus?: string
  newStatus?: string
}

/** Парсинг details JSON */
function parseDetails(details: string | null): LogDetails | null {
  if (!details) {
    return null
  }
  try {
    return JSON.parse(details) as LogDetails
  } catch {
    return null
  }
}

export function ModerationLogTab() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const initialFetchDone = useRef(false)

  const fetchLogs = useCallback(async (cursor?: string) => {
    const isLoadMore = !!cursor
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams({ limit: '50' })
      if (cursor) {
        params.set('cursor', cursor)
      }

      const res = await fetch(`/api/admin/moderation-log?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Ошибка загрузки')
      }

      const json = await res.json()
      const {
        logs: newLogs,
        nextCursor: nc,
        hasMore: hm,
      } = json.data as {
        logs: LogEntry[]
        nextCursor: string | null
        hasMore: boolean
      }

      if (isLoadMore) {
        setLogs((prev) => [...prev, ...newLogs])
      } else {
        setLogs(newLogs)
      }
      setNextCursor(nc)
      setHasMore(hm)
    } catch (err) {
      console.error('[moderation-log] Ошибка:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true
      fetchLogs()
    }
  }, [fetchLogs])

  if (loading) {
    return (
      <VStack py={12}>
        <Spinner size="lg" />
        <Text color="fg.muted">Загрузка логов...</Text>
      </VStack>
    )
  }

  if (logs.length === 0) {
    return (
      <VStack py={12}>
        <Icon as={LuHistory} boxSize={12} color="fg.muted" />
        <Text color="fg.muted" fontSize="lg">
          Логов пока нет
        </Text>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box overflowX="auto">
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Дата</Table.ColumnHeader>
              <Table.ColumnHeader>Модератор</Table.ColumnHeader>
              <Table.ColumnHeader>Действие</Table.ColumnHeader>
              <Table.ColumnHeader>Аниме</Table.ColumnHeader>
              <Table.ColumnHeader>Детали</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {logs.map((log) => {
              const { text, color } = actionLabel(log.action)
              const details = parseDetails(log.details)

              return (
                <Table.Row key={log.id}>
                  <Table.Cell whiteSpace="nowrap">
                    <Text fontSize="sm">{formatDate(log.createdAt)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" fontWeight="medium">
                      {log.moderator.name || 'Без имени'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={color} size="sm">
                      {text}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell maxW="300px">
                    <Text fontSize="sm" truncate title={log.animeTitle}>
                      {log.animeTitle}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {details && (
                      <HStack gap={1} flexWrap="wrap">
                        {details.replacedAnimeId && (
                          <Badge colorPalette="orange" size="sm" variant="subtle">
                            заменено
                          </Badge>
                        )}
                        {details.newStatus && (
                          <Badge
                            colorPalette={details.newStatus === 'PUBLISHED' ? 'green' : 'red'}
                            size="sm"
                            variant="outline"
                          >
                            → {details.newStatus}
                          </Badge>
                        )}
                      </HStack>
                    )}
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Box>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => nextCursor && fetchLogs(nextCursor)}
          loading={loadingMore}
          alignSelf="center"
        >
          <Icon as={LuChevronDown} mr={1} />
          Загрузить ещё
        </Button>
      )}
    </VStack>
  )
}
