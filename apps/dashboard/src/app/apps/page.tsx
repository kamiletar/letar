'use client'

import { AppCard } from '@/app/_components/apps/AppCard'
import { Header } from '@/app/_components/layout/Header'
import { AppCardSkeleton, SkeletonGrid } from '@/app/_components/ui/skeletons'
import { useServerContext } from '@/lib/contexts/ServerContext'
import { Box, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'

interface ContainerStatus {
  running: boolean
  uptime?: number
  cpu?: number
  memory?: number
}

interface StorageStats {
  total: number
}

/**
 * Получает статус контейнера по имени
 */
async function fetchContainerStatus(containerName: string, serverId: string | null): Promise<ContainerStatus | null> {
  try {
    const url = serverId
      ? `/api/docker/containers/by-name/${containerName}/status?serverId=${encodeURIComponent(serverId)}`
      : `/api/docker/containers/by-name/${containerName}/status`

    const res = await fetch(url)
    if (!res.ok) {
      return null
    }
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Получает размер storage для приложения
 */
async function fetchAppStorage(appName: string, serverId: string | null): Promise<StorageStats | null> {
  try {
    const url = serverId
      ? `/api/apps/${appName}/storage?serverId=${encodeURIComponent(serverId)}`
      : `/api/apps/${appName}/storage`

    const res = await fetch(url)
    if (!res.ok) {
      return null
    }
    return await res.json()
  } catch {
    return null
  }
}

interface AppFromServer {
  id: string
  name: string
  displayName: string
  containerName: string | null
  port: number | null
  type: string
  imageName?: string | null
  lastDeployed?: string | null
}

/**
 * Карточка приложения с данными в реальном времени
 */
function AppCardWithData({ app, serverId }: { app: AppFromServer; serverId: string | null }) {
  const isWeb = app.type === 'WEB'

  // Статус контейнера (если есть containerName)
  const { data: containerStatus } = useQuery({
    queryKey: ['container-status', app.containerName, serverId],
    queryFn: () => fetchContainerStatus(app.containerName!, serverId),
    enabled: !!app.containerName,
    refetchInterval: 5000,
  })

  // Storage (только для web приложений)
  const { data: storage } = useQuery({
    queryKey: ['app-storage', app.name, serverId],
    queryFn: () => fetchAppStorage(app.name, serverId),
    enabled: isWeb,
    refetchInterval: 30000,
  })

  return (
    <AppCard
      name={app.name}
      displayName={app.displayName}
      type={isWeb ? 'web' : 'cli'}
      port={app.port ?? undefined}
      status={containerStatus ? { running: containerStatus.running, uptime: containerStatus.uptime } : undefined}
      stats={
        containerStatus?.running && containerStatus.cpu !== undefined
          ? { cpu: containerStatus.cpu, memory: containerStatus.memory ?? 0 }
          : undefined
      }
      storage={storage ? { total: storage.total } : undefined}
    />
  )
}

export default function AppsPage() {
  const { currentServer, isLoading, error } = useServerContext()

  // Приложения из текущего сервера
  const apps = currentServer?.apps ?? []
  const selectedServerId = currentServer?.isLocal ? null : (currentServer?.id ?? null)

  if (isLoading) {
    return (
      <>
        <Header />
        <Box p="8">
          <Heading mb="6">Приложения</Heading>
          <SkeletonGrid count={6} columns={{ base: 1, md: 2, lg: 3 }} SkeletonComponent={AppCardSkeleton} />
        </Box>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <Box p="8">
          <Text color="red.500">Ошибка загрузки: {error}</Text>
        </Box>
      </>
    )
  }

  if (!currentServer) {
    return (
      <>
        <Header />
        <Box p="8">
          <Text color="fg.muted">Сервер не выбран</Text>
        </Box>
      </>
    )
  }

  return (
    <>
      <Header />
      <Box p="8">
        <Heading mb="6">Приложения — {currentServer.displayName}</Heading>

        {apps.length === 0 ? (
          <Text color="fg.muted">На этом сервере нет приложений</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6">
            {apps.map((app) => (
              <AppCardWithData key={app.id} app={app} serverId={selectedServerId} />
            ))}
          </SimpleGrid>
        )}
      </Box>
    </>
  )
}
