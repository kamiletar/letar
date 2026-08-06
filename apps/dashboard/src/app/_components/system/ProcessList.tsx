'use client'

import { useServerContext } from '@/lib/contexts/ServerContext'
import { formatBytes } from '@/lib/format'
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Progress,
  Spinner,
  Table,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { memo, useMemo, useState } from 'react'

interface Process {
  pid: number
  name: string
  command: string
  cpu: number
  mem: number
  memRss: number
  memVsz: number
  user: string
  state: string
}

interface MemoryGroup {
  name: string
  count: number
  totalMem: number
  totalMemPercent: number
}

interface MemorySummary {
  total: number
  used: number
  active: number
  available: number
  buffcache: number
  slab: number
  totalProcessMemory: number
  topProcessesMemory: number
  kernelAndBuffers: number
}

interface DockerContainer {
  id: string
  name: string
  memoryUsage: number
  memoryLimit: number
  memoryPercent: number
}

interface DockerMemory {
  total: number
  containerCount: number
  containers: DockerContainer[]
}

interface ProcessesData {
  all: number
  running: number
  blocked: number
  sleeping: number
  topByMemory: Process[]
  memoryGroups: MemoryGroup[]
  memorySummary: MemorySummary
  dockerMemory?: DockerMemory
}

/**
 * Мемоизированный компонент списка процессов
 * Показывает использование памяти по процессам, Docker контейнерам и группам
 */
export const ProcessList = memo(function ProcessList() {
  const [activeTab, setActiveTab] = useState('docker')
  const { selectedServerId } = useServerContext()
  const { data, isLoading, error, refetch, isFetching } = useQuery<ProcessesData>({
    queryKey: ['system', 'processes', selectedServerId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' })
      if (selectedServerId) {
        params.set('serverId', selectedServerId)
      }
      const res = await fetch(`/api/system/processes?${params}`)
      if (!res.ok) {
        throw new Error('Failed to fetch processes')
      }
      return res.json()
    },
    refetchInterval: 30000, // 30 сек — процессы меняются медленно
  })

  // Мемоизация вычислений процентов
  const memoryStats = useMemo(() => {
    const summary = data?.memorySummary
    const dockerMem = data?.dockerMemory

    if (!summary) {
      return {
        summary: null,
        dockerMem: null,
        usedPercent: 0,
        processPercent: 0,
        buffcachePercent: 0,
        dockerPercent: 0,
        slabPercent: 0,
        otherMemory: 0,
        otherPercent: 0,
      }
    }

    const usedPercent = (summary.used / summary.total) * 100
    const processPercent = (summary.totalProcessMemory / summary.total) * 100
    const buffcachePercent = (summary.buffcache / summary.total) * 100
    const dockerPercent = dockerMem ? (dockerMem.total / summary.total) * 100 : 0
    const slabPercent = (summary.slab / summary.total) * 100
    const otherMemory = summary.used - summary.totalProcessMemory - (dockerMem?.total || 0) - summary.buffcache
      - summary.slab
    const otherPercent = (otherMemory / summary.total) * 100

    return {
      summary,
      dockerMem,
      usedPercent,
      processPercent,
      buffcachePercent,
      dockerPercent,
      slabPercent,
      otherMemory,
      otherPercent,
    }
  }, [data?.memorySummary, data?.dockerMemory])

  const {
    summary,
    dockerMem,
    usedPercent,
    processPercent,
    buffcachePercent,
    dockerPercent,
    slabPercent,
    otherMemory,
    otherPercent,
  } = memoryStats

  if (error) {
    return (
      <Card.Root>
        <Card.Body p={4}>
          <Text color="red.400">Ошибка загрузки процессов</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header p={4} pb={2}>
        <HStack justify="space-between">
          <Heading size="md">Использование памяти</Heading>
          <HStack gap={4}>
            {data && (
              <HStack gap={2} fontSize="sm" color="fg.muted">
                <Badge colorPalette="green" size="sm">
                  {data.running} running
                </Badge>
                <Text>Всего: {data.all}</Text>
              </HStack>
            )}
            <Button size="xs" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Spinner size="xs" /> : '↻'}
            </Button>
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body p={4} pt={0}>
        {isLoading
          ? (
            <HStack justify="center" py={8}>
              <Spinner size="lg" color="brand.500" />
            </HStack>
          )
          : (
            <VStack gap={4} align="stretch">
              {/* Memory Summary */}
              {summary && (
                <Box bg="bg.muted" p={3} borderRadius="md">
                  <Text fontWeight="medium" mb={2} color="fg.muted">
                    Распределение памяти ({formatBytes(summary.total)})
                  </Text>
                  <VStack gap={2} align="stretch">
                    {dockerMem && dockerMem.total > 0 && (
                      <HStack justify="space-between" fontSize="sm">
                        <Text color="fg.muted">Docker ({dockerMem.containerCount}):</Text>
                        <Text color="purple.400" fontWeight="medium">
                          {formatBytes(dockerMem.total)} ({dockerPercent.toFixed(1)}%)
                        </Text>
                      </HStack>
                    )}
                    <HStack justify="space-between" fontSize="sm">
                      <Text color="fg.muted">Процессы хоста:</Text>
                      <Text color="green.400" fontWeight="medium">
                        {formatBytes(summary.totalProcessMemory)} ({processPercent.toFixed(1)}%)
                      </Text>
                    </HStack>
                    <HStack justify="space-between" fontSize="sm">
                      <Text color="fg.muted">Буферы/кеш:</Text>
                      <Text color="blue.400" fontWeight="medium">
                        {formatBytes(summary.buffcache)} ({buffcachePercent.toFixed(1)}%)
                      </Text>
                    </HStack>
                    {summary.slab > 0 && (
                      <HStack justify="space-between" fontSize="sm">
                        <Text color="fg.muted">Ядро (slab):</Text>
                        <Text color="orange.400" fontWeight="medium">
                          {formatBytes(summary.slab)} ({slabPercent.toFixed(1)}%)
                        </Text>
                      </HStack>
                    )}
                    {otherMemory > 0 && (
                      <HStack justify="space-between" fontSize="sm">
                        <Text color="fg.muted">Прочее:</Text>
                        <Text color="fg.subtle" fontWeight="medium">
                          {formatBytes(otherMemory)} ({otherPercent.toFixed(1)}%)
                        </Text>
                      </HStack>
                    )}
                    <Box borderTop="1px solid" borderColor="border.muted" pt={2} mt={1}>
                      <HStack justify="space-between" fontSize="sm">
                        <Text color="fg.muted">Используется:</Text>
                        <Text color="yellow.400" fontWeight="medium">
                          {formatBytes(summary.used)} ({usedPercent.toFixed(1)}%)
                        </Text>
                      </HStack>
                      <HStack justify="space-between" fontSize="sm">
                        <Text color="fg.muted">Доступно:</Text>
                        <Text color="fg" fontWeight="medium">
                          {formatBytes(summary.available)}
                        </Text>
                      </HStack>
                    </Box>
                  </VStack>
                </Box>
              )}

              {/* Tabs */}
              <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)} size="sm">
                <Tabs.List>
                  <Tabs.Trigger value="docker">Docker</Tabs.Trigger>
                  <Tabs.Trigger value="summary">По группам</Tabs.Trigger>
                  <Tabs.Trigger value="processes">По процессам</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="docker" pt={3}>
                  {dockerMem && dockerMem.containers.length > 0
                    ? (
                      <VStack gap={2} align="stretch">
                        {dockerMem.containers.map((container) => {
                          const containerPercent = summary ? (container.memoryUsage / summary.total) * 100 : 0
                          return (
                            <Box key={container.id}>
                              <HStack justify="space-between" mb={1}>
                                <Text fontSize="sm" fontWeight="medium" truncate maxW="180px" title={container.name}>
                                  {container.name}
                                </Text>
                                <Text fontSize="sm" color="fg.muted">
                                  {formatBytes(container.memoryUsage)} ({containerPercent.toFixed(1)}%)
                                </Text>
                              </HStack>
                              <Progress.Root
                                value={containerPercent}
                                size="xs"
                                colorPalette={containerPercent > 20
                                  ? 'red'
                                  : containerPercent > 10
                                  ? 'yellow'
                                  : 'purple'}
                              >
                                <Progress.Track>
                                  <Progress.Range />
                                </Progress.Track>
                              </Progress.Root>
                            </Box>
                          )
                        })}
                      </VStack>
                    )
                    : (
                      <Text fontSize="sm" color="fg.muted">
                        Нет запущенных контейнеров
                      </Text>
                    )}
                </Tabs.Content>

                <Tabs.Content value="summary" pt={3}>
                  <VStack gap={2} align="stretch">
                    {data?.memoryGroups.slice(0, 10).map((group) => (
                      <Box key={group.name}>
                        <HStack justify="space-between" mb={1}>
                          <HStack>
                            <Text fontSize="sm" fontWeight="medium">
                              {group.name}
                            </Text>
                            {group.count > 1 && (
                              <Badge size="sm" colorPalette="gray">
                                ×{group.count}
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="sm" color="fg.muted">
                            {formatBytes(group.totalMem)} ({group.totalMemPercent.toFixed(1)}%)
                          </Text>
                        </HStack>
                        <Progress.Root
                          value={group.totalMemPercent}
                          size="xs"
                          colorPalette={group.totalMemPercent > 20
                            ? 'red'
                            : group.totalMemPercent > 10
                            ? 'yellow'
                            : 'green'}
                        >
                          <Progress.Track>
                            <Progress.Range />
                          </Progress.Track>
                        </Progress.Root>
                      </Box>
                    ))}
                  </VStack>
                </Tabs.Content>

                <Tabs.Content value="processes" pt={3}>
                  <Box overflowX="auto">
                    <Table.Root size="sm" variant="line">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader color="fg.muted" fontSize="xs">
                            PID
                          </Table.ColumnHeader>
                          <Table.ColumnHeader color="fg.muted" fontSize="xs">
                            Процесс
                          </Table.ColumnHeader>
                          <Table.ColumnHeader color="fg.muted" fontSize="xs" textAlign="right">
                            CPU
                          </Table.ColumnHeader>
                          <Table.ColumnHeader color="fg.muted" fontSize="xs" textAlign="right">
                            MEM
                          </Table.ColumnHeader>
                          <Table.ColumnHeader color="fg.muted" fontSize="xs" textAlign="right">
                            RSS
                          </Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {data?.topByMemory.map((proc) => (
                          <Table.Row key={proc.pid}>
                            <Table.Cell fontFamily="mono" fontSize="xs" color="fg.muted">
                              {proc.pid}
                            </Table.Cell>
                            <Table.Cell>
                              <Text fontWeight="medium" fontSize="sm" truncate maxW="150px" title={proc.command}>
                                {proc.name}
                              </Text>
                            </Table.Cell>
                            <Table.Cell textAlign="right">
                              <Text
                                fontSize="sm"
                                color={proc.cpu > 50 ? 'red.400' : proc.cpu > 20 ? 'yellow.400' : 'fg'}
                              >
                                {proc.cpu.toFixed(1)}%
                              </Text>
                            </Table.Cell>
                            <Table.Cell textAlign="right">
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                color={proc.mem > 10 ? 'red.400' : proc.mem > 5 ? 'yellow.400' : 'green.400'}
                              >
                                {proc.mem.toFixed(1)}%
                              </Text>
                            </Table.Cell>
                            <Table.Cell textAlign="right" fontFamily="mono" fontSize="xs" color="fg.muted">
                              {formatBytes(proc.memRss)}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                </Tabs.Content>
              </Tabs.Root>
            </VStack>
          )}
      </Card.Body>
    </Card.Root>
  )
})
