'use client'

import { toaster } from '@/app/_components/ui/toaster'
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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { memo, useOptimistic, useState, useTransition } from 'react'

interface DiskInfo {
  fs: string
  type: string
  size: number
  used: number
  available: number
  use: number
  mount: string
}

interface HostDisk {
  filesystem: string
  size: number
  used: number
  available: number
  usePercent: number
  mount: string
  sizeHuman: string
  usedHuman: string
  availableHuman: string
}

interface DirSize {
  path: string
  size: number
  sizeHuman: string
  percent?: number
}

interface DockerImageDetail {
  id: string
  repoTags: string[]
  size: number
  sizeHuman: string
}

interface DockerContainerDetail {
  id: string
  name: string
  size: number
  sizeHuman: string
  state: string
}

interface DockerVolumeDetail {
  name: string
  size: number
  sizeHuman: string
  mountpoint: string
}

interface DockerBuildCacheDetail {
  id: string
  type: string
  size: number
  sizeHuman: string
  inUse: boolean
}

interface DockerDiskUsage {
  images: {
    total: number
    totalHuman: string
    count: number
    percent: number
    details: DockerImageDetail[]
  }
  containers: {
    total: number
    totalHuman: string
    count: number
    percent: number
    details: DockerContainerDetail[]
  }
  volumes: {
    total: number
    totalHuman: string
    count: number
    percent: number
    details: DockerVolumeDetail[]
  }
  buildCache: {
    total: number
    totalHuman: string
    count: number
    percent: number
    details: DockerBuildCacheDetail[]
  }
  totalSize: number
  totalSizeHuman: string
  totalPercent: number
}

interface DiskUsageData {
  disks: DiskInfo[]
  hostDisks?: HostDisk[]
  hostRootDirs?: DirSize[]
  hostKnownDirs?: DirSize[]
  docker?: DockerDiskUsage
  rootDirs?: DirSize[]
  knownDirs?: DirSize[]
  analyzedPath: string
  totalSize: number
  totalSizeHuman?: string
  usedSize?: number
  usedSizeHuman?: string
  usedPercent?: number
}

const getUsageColor = (percent: number) => {
  if (percent < 60) {
    return 'green'
  }
  if (percent < 80) {
    return 'yellow'
  }
  return 'red'
}

// Тип оптимистичного действия для Docker prune
type PruneAction = {
  type: 'prune'
  pruneType: 'buildCache' | 'images' | 'system'
}

/**
 * Мемоизированный компонент использования диска
 * Показывает информацию о дисках хоста и Docker
 */
export const DiskUsage = memo(function DiskUsage() {
  const [activeTab, setActiveTab] = useState('host')
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const { selectedServerId } = useServerContext()

  const { data, isLoading, error, isFetching } = useQuery<DiskUsageData>({
    queryKey: ['system', 'disk-usage', selectedServerId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedServerId) {
        params.set('serverId', selectedServerId)
      }
      const res = await fetch(`/api/system/disk-usage${params.toString() ? `?${params}` : ''}`)
      if (!res.ok) {
        throw new Error('Failed to fetch disk usage')
      }
      return res.json()
    },
    // Оптимизация: данные о диске меняются редко, не нужно обновлять часто
    refetchInterval: 5 * 60 * 1000, // 5 минут
    staleTime: 4 * 60 * 1000, // 4 минуты
  })

  // Принудительное обновление с bypass кэша
  const forceRefresh = async () => {
    const params = new URLSearchParams({ refresh: 'true' })
    if (selectedServerId) {
      params.set('serverId', selectedServerId)
    }
    const res = await fetch(`/api/system/disk-usage?${params}`)
    if (res.ok) {
      const newData = await res.json()
      queryClient.setQueryData(['system', 'disk-usage', selectedServerId], newData)
    }
  }

  // Оптимистичное состояние для Docker данных
  const [optimisticDocker, setOptimisticDocker] = useOptimistic(
    data?.docker,
    (state: DockerDiskUsage | undefined, action: PruneAction) => {
      if (!state) {
        return state
      }

      // При очистке build cache — сразу показываем 0
      if (action.pruneType === 'buildCache') {
        const clearedBuildCache = state.buildCache.total
        return {
          ...state,
          buildCache: {
            total: 0,
            totalHuman: '0 B',
            count: 0,
            percent: 0,
            details: [],
          },
          totalSize: state.totalSize - clearedBuildCache,
          totalSizeHuman: formatBytes(state.totalSize - clearedBuildCache),
          totalPercent: ((state.totalSize - clearedBuildCache) / state.totalSize) * state.totalPercent,
        }
      }

      return state
    }
  )

  // Обработчик очистки с useOptimistic
  const handlePrune = (pruneType: 'buildCache' | 'images' | 'system') => {
    startTransition(async () => {
      // Оптимистичное обновление
      setOptimisticDocker({ type: 'prune', pruneType })

      try {
        const res = await fetch('/api/docker/prune', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: pruneType, serverId: selectedServerId }),
        })

        if (!res.ok) {
          throw new Error('Failed to prune')
        }

        const result = await res.json()
        toaster.success({ title: 'Очистка завершена', description: result.message })
        queryClient.invalidateQueries({ queryKey: ['system', 'disk-usage'] })
      } catch (err) {
        queryClient.invalidateQueries({ queryKey: ['system', 'disk-usage'] })
        toaster.error({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось очистить' })
      }
    })
  }

  // Используем оптимистичные данные Docker
  const dockerData = optimisticDocker ?? data?.docker

  if (error) {
    return (
      <Card.Root>
        <Card.Body p={4}>
          <Text color="red.400">Ошибка загрузки информации о диске</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header p={4} pb={2}>
        <HStack justify="space-between">
          <Heading size="md">Использование диска</Heading>
          <Button size="xs" variant="ghost" onClick={() => forceRefresh()} disabled={isFetching}>
            {isFetching ? <Spinner size="xs" /> : '↻'}
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body p={4} pt={0}>
        {isLoading ? (
          <HStack justify="center" py={8}>
            <Spinner size="lg" color="brand.500" />
          </HStack>
        ) : (
          <VStack gap={4} align="stretch">
            {/* Файловые системы хоста */}
            <Box>
              <Text fontWeight="medium" mb={3} color="fg.muted">
                Файловые системы (хост)
              </Text>
              <VStack gap={3} align="stretch">
                {(data?.hostDisks || data?.disks)
                  ?.filter((d) => d.size > 0)
                  .slice(0, 5)
                  .map((disk) => {
                    const usePercent = 'usePercent' in disk ? disk.usePercent : (disk as DiskInfo).use
                    const mount = disk.mount
                    return (
                      <Box key={mount}>
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="sm" fontWeight="medium">
                            {mount}
                          </Text>
                          <Text fontSize="sm" color="fg.muted">
                            {'usedHuman' in disk ? disk.usedHuman : formatBytes((disk as DiskInfo).used)} /{' '}
                            {'sizeHuman' in disk ? disk.sizeHuman : formatBytes(disk.size)}
                          </Text>
                        </HStack>
                        <HStack gap={2}>
                          <Progress.Root value={usePercent} size="sm" flex={1} colorPalette={getUsageColor(usePercent)}>
                            <Progress.Track>
                              <Progress.Range />
                            </Progress.Track>
                          </Progress.Root>
                          <Text
                            fontSize="sm"
                            fontWeight="bold"
                            color={`${getUsageColor(usePercent)}.400`}
                            minW="50px"
                            textAlign="right"
                          >
                            {usePercent.toFixed(1)}%
                          </Text>
                        </HStack>
                      </Box>
                    )
                  })}
              </VStack>
            </Box>

            {/* Docker Disk Usage Summary */}
            {dockerData && (
              <Box
                bg="bg.muted"
                p={3}
                borderRadius="md"
                position="relative"
                opacity={isPending ? 0.7 : 1}
                transition="opacity 0.2s"
              >
                {isPending && (
                  <Box position="absolute" top={3} right={3}>
                    <Spinner size="sm" color="red.400" />
                  </Box>
                )}
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="medium" color="fg.muted">
                    Docker ({dockerData.totalSizeHuman})
                  </Text>
                  <Button
                    size="xs"
                    colorPalette="red"
                    variant="ghost"
                    onClick={() => handlePrune('buildCache')}
                    disabled={isPending || dockerData.buildCache.total === 0}
                  >
                    {isPending ? 'Очистка...' : 'Очистить кеш'}
                  </Button>
                </HStack>
                <VStack gap={2} align="stretch">
                  {dockerData.buildCache && dockerData.buildCache.total > 0 && (
                    <HStack justify="space-between" fontSize="sm">
                      <Text color="fg.muted">Build cache ({dockerData.buildCache.count}):</Text>
                      <Text color="red.400" fontWeight="medium">
                        {dockerData.buildCache.totalHuman} ({dockerData.buildCache.percent.toFixed(1)}%)
                      </Text>
                    </HStack>
                  )}
                  {dockerData.buildCache && dockerData.buildCache.total === 0 && isPending && (
                    <HStack justify="space-between" fontSize="sm">
                      <Text color="fg.muted">Build cache:</Text>
                      <Text color="green.400" fontWeight="medium">
                        Очищено ✓
                      </Text>
                    </HStack>
                  )}
                  <HStack justify="space-between" fontSize="sm">
                    <Text color="fg.muted">Образы ({dockerData.images.count}):</Text>
                    <Text color="purple.400" fontWeight="medium">
                      {dockerData.images.totalHuman} ({dockerData.images.percent.toFixed(1)}%)
                    </Text>
                  </HStack>
                  <HStack justify="space-between" fontSize="sm">
                    <Text color="fg.muted">Контейнеры ({dockerData.containers.count}):</Text>
                    <Text color="blue.400" fontWeight="medium">
                      {dockerData.containers.totalHuman} ({dockerData.containers.percent.toFixed(1)}%)
                    </Text>
                  </HStack>
                  <HStack justify="space-between" fontSize="sm">
                    <Text color="fg.muted">Volumes ({dockerData.volumes.count}):</Text>
                    <Text color="green.400" fontWeight="medium">
                      {dockerData.volumes.totalHuman} ({dockerData.volumes.percent.toFixed(1)}%)
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            )}

            {/* Tabs для директорий */}
            <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)} size="sm">
              <Tabs.List>
                <Tabs.Trigger value="host">Хост</Tabs.Trigger>
                <Tabs.Trigger value="docker">Docker</Tabs.Trigger>
                <Tabs.Trigger value="detailed">Детально</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="host" pt={3}>
                <VStack gap={2} align="stretch">
                  {(data?.hostRootDirs || data?.rootDirs)?.slice(0, 10).map((dir) => (
                    <Box key={dir.path}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm" fontWeight="medium" fontFamily="mono">
                          {dir.path}
                        </Text>
                        <Text fontSize="sm" color="fg.muted">
                          {dir.sizeHuman} ({dir.percent?.toFixed(1)}%)
                        </Text>
                      </HStack>
                      <Progress.Root
                        value={dir.percent || 0}
                        size="xs"
                        colorPalette={(dir.percent || 0) > 30 ? 'red' : (dir.percent || 0) > 15 ? 'yellow' : 'green'}
                      >
                        <Progress.Track>
                          <Progress.Range />
                        </Progress.Track>
                      </Progress.Root>
                    </Box>
                  ))}
                </VStack>
              </Tabs.Content>

              <Tabs.Content value="docker" pt={3}>
                {dockerData && (
                  <VStack gap={3} align="stretch">
                    {/* Docker Images */}
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="purple.400" mb={2}>
                        Образы
                      </Text>
                      {dockerData.images.details.slice(0, 5).map((img) => (
                        <HStack key={img.id} justify="space-between" fontSize="xs" mb={1}>
                          <Text fontFamily="mono" truncate maxW="200px" title={img.repoTags.join(', ')}>
                            {img.repoTags[0] || img.id}
                          </Text>
                          <Badge size="sm" colorPalette="purple">
                            {img.sizeHuman}
                          </Badge>
                        </HStack>
                      ))}
                    </Box>

                    {/* Docker Volumes */}
                    {dockerData.volumes.details.length > 0 && (
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" color="green.400" mb={2}>
                          Volumes
                        </Text>
                        {dockerData.volumes.details.slice(0, 5).map((vol) => (
                          <HStack key={vol.name} justify="space-between" fontSize="xs" mb={1}>
                            <Text fontFamily="mono" truncate maxW="200px" title={vol.name}>
                              {vol.name.slice(0, 20)}...
                            </Text>
                            <Badge size="sm" colorPalette="green">
                              {vol.sizeHuman}
                            </Badge>
                          </HStack>
                        ))}
                      </Box>
                    )}
                  </VStack>
                )}
              </Tabs.Content>

              <Tabs.Content value="detailed" pt={3}>
                {}
                {(data?.hostKnownDirs || data?.knownDirs) && (data.hostKnownDirs || data.knownDirs)!.length > 0 && (
                  <Box overflowX="auto">
                    <Table.Root size="sm" variant="line">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader color="fg.muted" fontSize="xs">
                            Путь
                          </Table.ColumnHeader>
                          <Table.ColumnHeader color="fg.muted" fontSize="xs" textAlign="right">
                            Размер
                          </Table.ColumnHeader>
                          <Table.ColumnHeader color="fg.muted" fontSize="xs" textAlign="right">
                            %
                          </Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {}
                        {(data.hostKnownDirs || data.knownDirs)!.slice(0, 15).map((dir) => (
                          <Table.Row key={dir.path}>
                            <Table.Cell>
                              <Text fontSize="sm" fontFamily="mono">
                                {dir.path}
                              </Text>
                            </Table.Cell>
                            <Table.Cell textAlign="right">
                              <Badge
                                size="sm"
                                colorPalette={
                                  dir.size > 10 * 1024 * 1024 * 1024
                                    ? 'red'
                                    : dir.size > 1024 * 1024 * 1024
                                      ? 'yellow'
                                      : 'green'
                                }
                              >
                                {dir.sizeHuman}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell textAlign="right" fontSize="xs" color="fg.muted">
                              {dir.percent?.toFixed(1)}%
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                )}
              </Tabs.Content>
            </Tabs.Root>

            {/* Советы */}
            <Box bg="bg.muted" p={3} borderRadius="md" fontSize="sm" color="fg.muted">
              <Text fontWeight="medium" color="fg" mb={1}>
                Советы по очистке диска:
              </Text>
              <VStack align="start" gap={1} fontSize="xs">
                <Text>
                  • <code>docker system prune -a</code> — удалить неиспользуемые образы
                </Text>
                <Text>
                  • <code>docker volume prune</code> — удалить неиспользуемые volumes
                </Text>
                <Text>
                  • <code>journalctl --vacuum-size=100M</code> — очистить логи
                </Text>
                <Text>
                  • <code>apt clean</code> — очистить кеш пакетов
                </Text>
              </VStack>
            </Box>
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  )
})
