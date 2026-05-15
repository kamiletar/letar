'use client'

import { removeContainer } from '@/app/_actions/docker-actions'
import { ContainerCard } from '@/app/_components/docker/ContainerCard'
import { DockerNav } from '@/app/_components/docker/DockerNav'
import { Header } from '@/app/_components/layout/Header'
import { AppCardSkeleton, SkeletonGrid } from '@/app/_components/ui/skeletons'
import { toaster } from '@/app/_components/ui/toaster'
import { useServerContext } from '@/lib/contexts/ServerContext'
import { Box, Button, Heading, HStack, SimpleGrid, Text } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOptimistic, useTransition } from 'react'

// Образы баз данных для группировки
const DB_IMAGES = ['postgres', 'mysql', 'mariadb', 'redis', 'mongodb', 'mongo', 'memcached']

// Определение типа контейнера по image
const isDatabase = (image: string) => DB_IMAGES.some((db) => image.toLowerCase().includes(db))

interface Container {
  id: string
  names: string[]
  image: string
  state: string
  status: string
  created: number
  ports: Array<{
    privatePort: number
    publicPort?: number
    type: string
  }>
  stats?: {
    cpuPercent: string
    memoryUsage: number
    memoryLimit: number
    memoryPercent: string
  } | null
}

// Тип для оптимистичного обновления состояния
interface OptimisticAction {
  containerId: string
  targetState: 'starting' | 'stopping' | 'restarting' | 'removing'
}

async function fetchContainers(serverId: string | null, withStats = false) {
  const params = new URLSearchParams({ all: 'true', withStats: String(withStats) })
  if (serverId) {
    params.set('serverId', serverId)
  }
  const res = await fetch(`/api/docker/containers?${params}`)
  if (!res.ok) {
    throw new Error('Failed to fetch containers')
  }
  const data = await res.json()
  return data.containers as Container[]
}

// Управление контейнерами через API (поддерживает удалённые серверы)
async function controlContainerApi(
  containerId: string,
  action: 'start' | 'stop' | 'restart',
  serverId: string | null
): Promise<{ success: boolean; containerId?: string; error?: string }> {
  const body: Record<string, string> = { containerId, action }
  if (serverId) {
    body.serverId = serverId
  }
  const res = await fetch('/api/docker/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to control container' }
  }
  return { success: true, containerId }
}

export default function ContainersPage() {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const { selectedServerId } = useServerContext()

  const {
    data: containers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['docker-containers', selectedServerId],
    queryFn: () => fetchContainers(selectedServerId, true),
    refetchInterval: 5000,
  })

  // Оптимистичное состояние для контейнеров
  const [optimisticContainers, setOptimisticState] = useOptimistic(
    containers ?? [],
    (state: Container[], action: OptimisticAction) => {
      return state.map((container) => {
        if (container.id !== action.containerId) {
          return container
        }

        // Обновляем состояние в зависимости от действия
        switch (action.targetState) {
          case 'starting':
            return { ...container, state: 'starting', status: 'Starting...' }
          case 'stopping':
            return { ...container, state: 'stopping', status: 'Stopping...' }
          case 'restarting':
            return { ...container, state: 'restarting', status: 'Restarting...' }
          case 'removing':
            return { ...container, state: 'removing', status: 'Removing...' }
          default:
            return container
        }
      })
    }
  )

  // Обработчик Start с useOptimistic
  const handleStart = (containerId: string) => {
    startTransition(async () => {
      setOptimisticState({ containerId, targetState: 'starting' })

      const result = await controlContainerApi(containerId, 'start', selectedServerId)

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['docker-containers', selectedServerId] })
        toaster.create({
          title: 'Container started',
          type: 'success',
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['docker-containers', selectedServerId] })
        toaster.create({
          title: 'Failed to start container',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  // Обработчик Stop с useOptimistic
  const handleStop = (containerId: string) => {
    startTransition(async () => {
      setOptimisticState({ containerId, targetState: 'stopping' })

      const result = await controlContainerApi(containerId, 'stop', selectedServerId)

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['docker-containers', selectedServerId] })
        toaster.create({
          title: 'Container stopped',
          type: 'success',
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['docker-containers', selectedServerId] })
        toaster.create({
          title: 'Failed to stop container',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  // Обработчик Restart с useOptimistic
  const handleRestart = (containerId: string) => {
    startTransition(async () => {
      setOptimisticState({ containerId, targetState: 'restarting' })

      const result = await controlContainerApi(containerId, 'restart', selectedServerId)

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['docker-containers', selectedServerId] })
        toaster.create({
          title: 'Container restarted',
          type: 'success',
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['docker-containers', selectedServerId] })
        toaster.create({
          title: 'Failed to restart container',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  // Обработчик Remove (только для локального сервера)
  const handleRemove = (containerId: string) => {
    startTransition(async () => {
      setOptimisticState({ containerId, targetState: 'removing' })

      const result = await removeContainer(containerId)

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['docker-containers', selectedServerId] })
        toaster.create({
          title: 'Container removed',
          type: 'success',
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['docker-containers', selectedServerId] })
        toaster.create({
          title: 'Failed to remove container',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <DockerNav />
        <Box p="8">
          <Heading mb="6">Docker Containers</Heading>
          <SkeletonGrid count={4} columns={{ base: 1, md: 2, lg: 2 }} SkeletonComponent={AppCardSkeleton} />
        </Box>
      </>
    )
  }

  if (error) {
    return (
      <Box p="8">
        <Text color="red.500">Failed to load containers</Text>
      </Box>
    )
  }

  // Используем оптимистичное состояние
  const displayContainers = optimisticContainers.length > 0 ? optimisticContainers : (containers ?? [])

  // Фильтруем контейнеры по типу и статусу
  const isRunningOrTransitioning = (c: Container) =>
    c.state === 'running' || c.state === 'starting' || c.state === 'restarting'

  // Группы: БД (running) → Web (running) → Stopped (все)
  const runningDatabases = displayContainers.filter((c) => isRunningOrTransitioning(c) && isDatabase(c.image))
  const runningWebApps = displayContainers.filter((c) => isRunningOrTransitioning(c) && !isDatabase(c.image))
  const stoppedContainers = displayContainers.filter(
    (c) => c.state !== 'running' && c.state !== 'starting' && c.state !== 'restarting' && c.state !== 'removing'
  )

  return (
    <>
      <Header />
      <Box p={{ base: '4', md: '8' }}>
        <DockerNav />
        <HStack justify="space-between" mb="6" flexWrap="wrap" gap="2">
          <Heading>Docker Containers</Heading>
          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['docker-containers', selectedServerId] })}
              disabled={isPending}
            >
              Refresh
            </Button>
          </HStack>
        </HStack>

        {/* Компактная статистика */}
        <HStack gap="4" mb="4" fontSize="sm">
          <Text>
            Total:{' '}
            <Text as="span" fontWeight="bold">
              {displayContainers.length}
            </Text>
          </Text>
          <Text>
            Running:{' '}
            <Text as="span" fontWeight="bold" color="green.500">
              {displayContainers.filter((c) => c.state === 'running').length}
            </Text>
          </Text>
          <Text>
            Stopped:{' '}
            <Text as="span" fontWeight="bold" color="red.500">
              {displayContainers.filter((c) => c.state === 'exited').length}
            </Text>
          </Text>
        </HStack>

        {/* Databases (Running) */}
        {runningDatabases.length > 0 && (
          <Box mb="4">
            <Heading size="sm" mb="2">
              Databases
            </Heading>
            <SimpleGrid columns={{ base: 1, lg: 2, xl: 3, '2xl': 4 }} gap="3">
              {runningDatabases.map((container) => (
                <ContainerCard
                  key={container.id}
                  {...container}
                  onStop={() => handleStop(container.id)}
                  onRestart={() => handleRestart(container.id)}
                  isTransitioning={
                    container.state === 'starting' || container.state === 'stopping' || container.state === 'restarting'
                  }
                />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Web Applications (Running) */}
        {runningWebApps.length > 0 && (
          <Box mb="4">
            <Heading size="sm" mb="2">
              Web Applications
            </Heading>
            <SimpleGrid columns={{ base: 1, lg: 2, xl: 3, '2xl': 4 }} gap="3">
              {runningWebApps.map((container) => (
                <ContainerCard
                  key={container.id}
                  {...container}
                  onStop={() => handleStop(container.id)}
                  onRestart={() => handleRestart(container.id)}
                  isTransitioning={
                    container.state === 'starting' || container.state === 'stopping' || container.state === 'restarting'
                  }
                />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Stopped containers */}
        {stoppedContainers.length > 0 && (
          <Box>
            <Heading size="sm" mb="2">
              Stopped
            </Heading>
            <SimpleGrid columns={{ base: 1, lg: 2, xl: 3, '2xl': 4 }} gap="3">
              {stoppedContainers.map((container) => (
                <ContainerCard
                  key={container.id}
                  {...container}
                  onStart={() => handleStart(container.id)}
                  onRemove={() => handleRemove(container.id)}
                  isTransitioning={container.state === 'removing'}
                />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {displayContainers.length === 0 && (
          <Box textAlign="center" py="12">
            <Text color="fg.muted">No containers found</Text>
          </Box>
        )}
      </Box>
    </>
  )
}
