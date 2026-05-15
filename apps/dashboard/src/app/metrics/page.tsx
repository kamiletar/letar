'use client'

import { Badge, Box, Button, Card, Heading, HStack, SimpleGrid, Spinner, Stat, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTransition } from 'react'

import { Header } from '@/app/_components/layout/Header'

interface HealthCheckResult {
  timestamp: string
  responseTime: number
  status: 'up' | 'down'
  statusCode: number | null
  error: string | null
}

interface AppMetrics {
  app: string
  lastCheck: string | null
  lastStatus: 'up' | 'down' | null
  avgResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  uptime: number
  errorRate: number
  totalChecks: number
  successfulChecks: number
  history: HealthCheckResult[]
}

interface MetricsResponse {
  metrics: AppMetrics[]
}

async function fetchMetrics(): Promise<MetricsResponse> {
  const res = await fetch('/api/monitoring/health-check')
  if (!res.ok) {
    throw new Error('Failed to fetch metrics')
  }
  return res.json()
}

async function runHealthChecks(): Promise<MetricsResponse> {
  const res = await fetch('/api/monitoring/health-check', { method: 'POST' })
  if (!res.ok) {
    throw new Error('Failed to run health checks')
  }
  return res.json()
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(2)}s`
}

function MetricCard({ metrics }: { metrics: AppMetrics }) {
  const isUp = metrics.lastStatus === 'up'

  return (
    <Card.Root>
      <Card.Body p="5">
        <VStack align="stretch" gap="4">
          {/* Заголовок с статусом */}
          <HStack justify="space-between">
            <Heading size="md">{metrics.app}</Heading>
            <Badge colorPalette={isUp ? 'green' : metrics.lastStatus === null ? 'gray' : 'red'}>
              {isUp ? 'UP' : metrics.lastStatus === null ? 'Unknown' : 'DOWN'}
            </Badge>
          </HStack>

          {/* Метрики */}
          {metrics.totalChecks > 0 ? (
            <SimpleGrid columns={2} gap="4">
              <Stat.Root>
                <Stat.Label>Avg Response</Stat.Label>
                <Stat.ValueText>{formatDuration(metrics.avgResponseTime)}</Stat.ValueText>
              </Stat.Root>

              <Stat.Root>
                <Stat.Label>Uptime</Stat.Label>
                <Stat.ValueText>
                  <Text
                    as="span"
                    color={metrics.uptime >= 99 ? 'green.500' : metrics.uptime >= 95 ? 'yellow.500' : 'red.500'}
                  >
                    {metrics.uptime}%
                  </Text>
                </Stat.ValueText>
              </Stat.Root>

              <Stat.Root>
                <Stat.Label>Error Rate</Stat.Label>
                <Stat.ValueText>
                  <Text
                    as="span"
                    color={metrics.errorRate === 0 ? 'green.500' : metrics.errorRate < 5 ? 'yellow.500' : 'red.500'}
                  >
                    {metrics.errorRate}%
                  </Text>
                </Stat.ValueText>
              </Stat.Root>

              <Stat.Root>
                <Stat.Label>Min/Max</Stat.Label>
                <Stat.ValueText fontSize="sm">
                  {formatDuration(metrics.minResponseTime)} / {formatDuration(metrics.maxResponseTime)}
                </Stat.ValueText>
              </Stat.Root>
            </SimpleGrid>
          ) : (
            <Text color="gray.500" fontSize="sm">
              Нет данных. Запустите проверку.
            </Text>
          )}

          {/* Последняя проверка */}
          {metrics.lastCheck && (
            <Text fontSize="xs" color="gray.500">
              Последняя проверка: {new Date(metrics.lastCheck).toLocaleString('ru-RU')}
            </Text>
          )}

          {/* Последние ошибки */}
          {metrics.history.filter((h) => h.status === 'down').slice(0, 3).length > 0 && (
            <Box>
              <Text fontSize="xs" fontWeight="medium" color="red.500" mb="1">
                Последние ошибки:
              </Text>
              {metrics.history
                .filter((h) => h.status === 'down')
                .slice(0, 3)
                .map((h) => (
                  <Text key={h.timestamp} fontSize="xs" color="gray.600">
                    {new Date(h.timestamp).toLocaleTimeString('ru-RU')} - {h.error}
                  </Text>
                ))}
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

export default function MetricsPage() {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const { data, isLoading, error } = useQuery({
    queryKey: ['app-metrics'],
    queryFn: fetchMetrics,
    refetchInterval: 30000, // Обновление каждые 30 сек
  })

  const mutation = useMutation({
    mutationFn: runHealthChecks,
    onSuccess: (data) => {
      queryClient.setQueryData(['app-metrics'], data)
    },
  })

  const handleRunChecks = () => {
    startTransition(() => {
      mutation.mutate()
    })
  }

  if (error) {
    return (
      <>
        <Header />
        <Box p="8">
          <Text color="red.500">Ошибка загрузки метрик</Text>
        </Box>
      </>
    )
  }

  return (
    <>
      <Header />
      <Box p="8">
        <HStack justify="space-between" mb="6">
          <Heading>Метрики приложений</Heading>
          <Button colorPalette="blue" onClick={handleRunChecks} disabled={mutation.isPending || isPending}>
            {mutation.isPending || isPending ? (
              <>
                <Spinner size="sm" mr="2" />
                Проверка...
              </>
            ) : (
              'Запустить проверку'
            )}
          </Button>
        </HStack>

        {isLoading ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card.Root key={i}>
                <Card.Body p="5">
                  <Spinner />
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6">
            {Array.isArray(data?.metrics) && data.metrics.map((m) => <MetricCard key={m.app} metrics={m} />)}
          </SimpleGrid>
        )}
      </Box>
    </>
  )
}
