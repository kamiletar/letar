'use client'

import { toaster } from '@/app/_components/ui/toaster'
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
import { LuChevronLeft, LuChevronRight, LuFileText, LuRefreshCw, LuSearch, LuTrash2 } from 'react-icons/lu'

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
  createdAt: string
  apiKey: {
    id: string
    name: string
    keyPrefix: string
  } | null
  school: {
    id: string
    name: string
  } | null
}

interface School {
  id: string
  name: string
}

interface Props {
  schools: School[]
}

export function ApiLogsClient({ schools }: Props) {
  const [logs, setLogs] = useState<ApiLogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Пагинация
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  // Фильтры
  const [schoolFilter, setSchoolFilter] = useState('')
  const [endpointFilter, setEndpointFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all')

  // Ротация
  const [isRotating, setIsRotating] = useState(false)

  // Загрузка логов
  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })

      if (schoolFilter) {
        params.set('schoolId', schoolFilter)
      }
      if (endpointFilter) {
        params.set('endpoint', endpointFilter)
      }
      if (statusFilter === 'success') {
        params.set('statusCode', '200')
      } else if (statusFilter === 'error') {
        params.set('statusCode', '500')
      }

      const response = await fetch(`/api/owner/api-logs?${params}`)
      const result = await response.json()

      if (response.ok) {
        setLogs(result.data)
        setTotal(result.meta.total)
        setTotalPages(result.meta.totalPages)
      } else {
        setError(result.error || 'Ошибка загрузки')
      }
    } catch {
      setError('Ошибка соединения')
    }

    setIsLoading(false)
  }, [page, limit, schoolFilter, endpointFilter, statusFilter])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Ротация логов
  const handleRotateLogs = async () => {
    if (!confirm('Удалить логи старше 30 дней?')) {
      return
    }

    setIsRotating(true)

    try {
      const response = await fetch('/api/owner/api-logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanDays: 30 }),
      })
      const result = await response.json()

      if (response.ok) {
        toaster.success({
          title: 'Ротация завершена',
          description: `Удалено ${result.deleted} записей`,
        })
        loadLogs()
      } else {
        toaster.error({ title: result.error || 'Ошибка ротации' })
      }
    } catch {
      toaster.error({ title: 'Ошибка соединения' })
    }

    setIsRotating(false)
  }

  // Цвет статуса
  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return 'green'
    }
    if (statusCode >= 400 && statusCode < 500) {
      return 'yellow'
    }
    if (statusCode >= 500) {
      return 'red'
    }
    return 'gray'
  }

  // Форматирование времени ответа
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}мс`
    }
    return `${(ms / 1000).toFixed(2)}с`
  }

  return (
    <Stack gap={6}>
      {/* Заголовок */}
      <HStack justify="space-between">
        <Heading size="lg">Логи API</Heading>
        <HStack>
          <Button size="sm" variant="ghost" onClick={loadLogs} loading={isLoading}>
            <LuRefreshCw />
          </Button>
          <Button size="sm" colorPalette="red" variant="outline" onClick={handleRotateLogs} loading={isRotating}>
            <LuTrash2 />
            Ротация (30 дней)
          </Button>
        </HStack>
      </HStack>

      {/* Фильтры */}
      <Card.Root>
        <Card.Body>
          <HStack gap={4} wrap="wrap">
            <Box flex="1" minW="200px">
              <Text fontSize="sm" mb={1} color="fg.muted">
                Школа
              </Text>
              <select
                value={schoolFilter}
                onChange={(e) => {
                  setSchoolFilter(e.target.value)
                  setPage(1)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--chakra-colors-border-default)',
                  backgroundColor: 'var(--chakra-colors-bg-default)',
                }}
              >
                <option value="">Все школы</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </Box>
            <Box flex="1" minW="200px">
              <Text fontSize="sm" mb={1} color="fg.muted">
                Эндпоинт
              </Text>
              <HStack>
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
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color="fg.muted">
                Статус
              </Text>
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
            </Box>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Таблица логов */}
      <Card.Root>
        <Card.Body>
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
                    Логи API запросов появятся после первого использования API-ключей
                  </EmptyState.Description>
                </VStack>
              </EmptyState.Content>
            </EmptyState.Root>
          ) : (
            <Stack gap={4}>
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Время</Table.ColumnHeader>
                      <Table.ColumnHeader>Школа</Table.ColumnHeader>
                      <Table.ColumnHeader>Ключ</Table.ColumnHeader>
                      <Table.ColumnHeader>Метод</Table.ColumnHeader>
                      <Table.ColumnHeader>Эндпоинт</Table.ColumnHeader>
                      <Table.ColumnHeader>Статус</Table.ColumnHeader>
                      <Table.ColumnHeader>Время</Table.ColumnHeader>
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
                          <Text fontSize="sm" truncate maxW="150px">
                            {log.school?.name || '—'}
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
                          <Badge colorPalette={getStatusColor(log.statusCode)}>{log.statusCode}</Badge>
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
            </Stack>
          )}
        </Card.Body>
      </Card.Root>
    </Stack>
  )
}
