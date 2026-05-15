'use client'

import { getHttpStatusColor } from '@/app/_components/status-badge'
import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  EmptyState,
  Heading,
  HStack,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useCallback, useEffect, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuFileText, LuRefreshCw, LuSearch } from 'react-icons/lu'
import { getApiLogsAction, getApiLogsStatsAction } from '../_actions/api-logs.action'

interface Props {
  schoolId: string
}

interface ApiLogItem {
  id: string
  method: string
  endpoint: string
  statusCode: number
  responseTimeMs: number
  responseSize: number | null
  errorCode: string | null
  errorMessage: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  apiKey: {
    id: string
    name: string
    keyPrefix: string
  } | null
}

interface ApiLogsStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  requestsByEndpoint: { endpoint: string; count: number }[]
}

export function ApiLogsSection({ schoolId }: Props) {
  const [logs, setLogs] = useState<ApiLogItem[]>([])
  const [stats, setStats] = useState<ApiLogsStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Пагинация
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Фильтры
  const [endpointFilter, setEndpointFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all')

  // Загрузка логов
  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const statusCode = statusFilter === 'success' ? 200 : statusFilter === 'error' ? 500 : undefined

    const result = await getApiLogsAction({
      schoolId,
      page,
      limit,
      endpoint: endpointFilter || undefined,
      statusCode,
    })

    if (result.success && result.data) {
      setLogs(result.data.logs as ApiLogItem[])
      setTotal(result.data.pagination.total)
      setTotalPages(result.data.pagination.totalPages)
    } else {
      setError(result.error || 'Ошибка загрузки')
    }

    setIsLoading(false)
  }, [schoolId, page, limit, endpointFilter, statusFilter])

  // Загрузка статистики
  const loadStats = useCallback(async () => {
    const result = await getApiLogsStatsAction(schoolId)
    if (result.success && result.data) {
      setStats(result.data)
    }
  }, [schoolId])

  useEffect(() => {
    loadLogs()
    loadStats()
  }, [loadLogs, loadStats])

  // Форматирование времени ответа
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}мс`
    }
    return `${(ms / 1000).toFixed(2)}с`
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Логи API</Heading>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              loadLogs()
              loadStats()
            }}
            loading={isLoading}
          >
            <LuRefreshCw />
          </Button>
        </HStack>
      </Card.Header>

      <Card.Body>
        <Stack gap={6}>
          {/* Статистика */}
          {stats && (
            <HStack gap={4} wrap="wrap">
              <Box p={3} borderWidth={1} borderRadius="md" flex="1" minW="120px">
                <Text fontSize="sm" color="fg.muted">
                  Всего запросов
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {stats.totalRequests}
                </Text>
              </Box>
              <Box p={3} borderWidth={1} borderRadius="md" flex="1" minW="120px">
                <Text fontSize="sm" color="fg.muted">
                  Успешных
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="success.solid">
                  {stats.successfulRequests}
                </Text>
              </Box>
              <Box p={3} borderWidth={1} borderRadius="md" flex="1" minW="120px">
                <Text fontSize="sm" color="fg.muted">
                  Ошибок
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="error.solid">
                  {stats.failedRequests}
                </Text>
              </Box>
              <Box p={3} borderWidth={1} borderRadius="md" flex="1" minW="120px">
                <Text fontSize="sm" color="fg.muted">
                  Среднее время
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {formatResponseTime(stats.averageResponseTime)}
                </Text>
              </Box>
            </HStack>
          )}

          {/* Фильтры */}
          <HStack gap={4} wrap="wrap">
            <HStack flex="1" minW="200px">
              <LuSearch />
              <Input
                placeholder="Фильтр по эндпоинту..."
                value={endpointFilter}
                onChange={(e) => {
                  setEndpointFilter(e.target.value)
                  setPage(1)
                }}
                size="sm"
              />
            </HStack>
            <HStack>
              <Button
                size="sm"
                variant={statusFilter === 'all' ? 'solid' : 'outline'}
                onClick={() => {
                  setStatusFilter('all')
                  setPage(1)
                }}
              >
                Все
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'success' ? 'solid' : 'outline'}
                colorPalette="green"
                onClick={() => {
                  setStatusFilter('success')
                  setPage(1)
                }}
              >
                2xx
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'error' ? 'solid' : 'outline'}
                colorPalette="red"
                onClick={() => {
                  setStatusFilter('error')
                  setPage(1)
                }}
              >
                4xx/5xx
              </Button>
            </HStack>
          </HStack>

          {/* Таблица логов */}
          {isLoading ? (
            <VStack py={8}>
              <Spinner />
              <Text color="fg.muted">Загрузка логов...</Text>
            </VStack>
          ) : error ? (
            <Text color="error.solid">{error}</Text>
          ) : logs.length === 0 ? (
            <EmptyState.Root>
              <EmptyState.Content>
                <EmptyState.Indicator>
                  <LuFileText />
                </EmptyState.Indicator>
                <VStack textAlign="center">
                  <EmptyState.Title>Нет логов</EmptyState.Title>
                  <EmptyState.Description>
                    Логи API запросов появятся после первого использования API-ключа
                  </EmptyState.Description>
                </VStack>
              </EmptyState.Content>
            </EmptyState.Root>
          ) : (
            <>
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Время</Table.ColumnHeader>
                      <Table.ColumnHeader>Ключ</Table.ColumnHeader>
                      <Table.ColumnHeader>Метод</Table.ColumnHeader>
                      <Table.ColumnHeader>Эндпоинт</Table.ColumnHeader>
                      <Table.ColumnHeader>Статус</Table.ColumnHeader>
                      <Table.ColumnHeader>Время ответа</Table.ColumnHeader>
                      <Table.ColumnHeader>IP</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {logs.map((log) => (
                      <Table.Row key={log.id}>
                        <Table.Cell>
                          <Text fontSize="xs" color="fg.muted">
                            {formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Code size="sm">{log.apiKey?.keyPrefix || '—'}</Code>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge size="sm" variant="outline">
                            {log.method}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Code size="sm">{log.endpoint}</Code>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={getHttpStatusColor(log.statusCode)}>{log.statusCode}</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm">{formatResponseTime(log.responseTimeMs)}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs" color="fg.muted">
                            {log.ipAddress || '—'}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* Пагинация */}
              <HStack justify="space-between">
                <Text fontSize="sm" color="fg.muted">
                  Показано {(page - 1) * limit + 1}—{Math.min(page * limit, total)} из {total}
                </Text>
                <HStack>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <LuChevronLeft />
                  </Button>
                  <Text fontSize="sm">
                    {page} / {totalPages}
                  </Text>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <LuChevronRight />
                  </Button>
                </HStack>
              </HStack>
            </>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
