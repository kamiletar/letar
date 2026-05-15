/**
 * Docker API Wrapper
 * Взаимодействие с Docker через dockerode
 */

import Docker from 'dockerode'
import type {
  Container,
  ContainerLogs,
  ContainerStats,
  DockerDiskUsage,
  DockerImage,
  DockerNetwork,
  DockerVolume,
} from '../types'

// Инициализация Docker клиента
const socketPath = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock'
export const docker = new Docker({ socketPath })

// =============================================================================
// Кэширование
// =============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
}

let containersCache: CacheEntry<Container[]> | null = null
const CONTAINERS_CACHE_TTL = 10000 // 10 сек

// Кэш для getAllContainersMemory
let containersMemoryCache: CacheEntry<AllContainersMemory> | null = null
const CONTAINERS_MEMORY_CACHE_TTL = 15000 // 15 сек
const MAX_CONTAINERS_FOR_STATS = 10 // Лимит контейнеров для снижения нагрузки

interface ContainerMemory {
  id: string
  name: string
  memoryUsage: number
  memoryLimit: number
  memoryPercent: number
}

interface AllContainersMemory {
  containers: ContainerMemory[]
  totalDockerMemory: number
  containerCount: number
}

// =============================================================================
// Container Operations
// =============================================================================

/**
 * Получение списка контейнеров
 */
export async function getContainers(all = true): Promise<Container[]> {
  const now = Date.now()
  if (!all && containersCache && now - containersCache.timestamp < CONTAINERS_CACHE_TTL) {
    return containersCache.data
  }

  try {
    const containers = await docker.listContainers({ all })

    const result: Container[] = containers.map((c) => ({
      id: c.Id,
      name: c.Names[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
      image: c.Image,
      state: c.State,
      status: c.Status,
      created: c.Created,
      ports: c.Ports.map((p) => ({
        privatePort: p.PrivatePort,
        publicPort: p.PublicPort,
        type: p.Type,
      })),
    }))

    if (!all) {
      containersCache = { data: result, timestamp: now }
    }

    return result
  } catch (error) {
    console.error('[Docker] Error getting containers:', error)
    throw error
  }
}

/**
 * Получение статистики контейнера
 */
export async function getContainerStats(containerId: string): Promise<ContainerStats> {
  try {
    const container = docker.getContainer(containerId)
    const stats = await container.stats({ stream: false })

    const cpuStats = stats.cpu_stats
    const precpuStats = stats.precpu_stats
    const memStats = stats.memory_stats

    // Контейнер в переходном состоянии
    if (!cpuStats?.cpu_usage || !precpuStats?.cpu_usage) {
      return {
        cpu: 0,
        memory: 0,
        memoryUsage: memStats?.usage || 0,
        memoryLimit: memStats?.limit || 0,
        networkRx: stats.networks?.eth0?.rx_bytes || 0,
        networkTx: stats.networks?.eth0?.tx_bytes || 0,
        blockRead: stats.blkio_stats?.io_service_bytes_recursive?.[0]?.value || 0,
        blockWrite: stats.blkio_stats?.io_service_bytes_recursive?.[1]?.value || 0,
      }
    }

    // Расчет CPU
    const cpuDelta = cpuStats.cpu_usage.total_usage - precpuStats.cpu_usage.total_usage
    const systemDelta = (cpuStats.system_cpu_usage || 0) - (precpuStats.system_cpu_usage || 0)
    const onlineCpus = cpuStats.online_cpus || 1
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0

    // Расчет Memory
    const memoryUsage = memStats?.usage || 0
    const memoryLimit = memStats?.limit || 0
    const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0

    return {
      cpu: cpuPercent,
      memory: memoryPercent,
      memoryUsage,
      memoryLimit,
      networkRx: stats.networks?.eth0?.rx_bytes || 0,
      networkTx: stats.networks?.eth0?.tx_bytes || 0,
      blockRead: stats.blkio_stats?.io_service_bytes_recursive?.[0]?.value || 0,
      blockWrite: stats.blkio_stats?.io_service_bytes_recursive?.[1]?.value || 0,
    }
  } catch (error) {
    console.error(`[Docker] Error getting stats for ${containerId}:`, error)
    throw error
  }
}

/**
 * Управление контейнером
 */
export async function controlContainer(containerId: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
  try {
    const container = docker.getContainer(containerId)

    switch (action) {
      case 'start':
        await container.start()
        break
      case 'stop':
        await container.stop()
        break
      case 'restart':
        await container.restart()
        break
    }

    // Инвалидируем кэш
    containersCache = null
  } catch (error) {
    console.error(`[Docker] Error ${action} container ${containerId}:`, error)
    throw error
  }
}

/**
 * Получение логов контейнера
 */
export async function getContainerLogs(containerId: string, tail = 100): Promise<ContainerLogs> {
  try {
    const container = docker.getContainer(containerId)
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    })

    const logString = logs.toString()

    return {
      stdout: logString,
      stderr: '',
    }
  } catch (error) {
    console.error(`[Docker] Error getting logs for ${containerId}:`, error)
    throw error
  }
}

/**
 * Получение памяти всех контейнеров с кэшированием
 * Оптимизации:
 * - Кэширование на 15 сек
 * - Последовательные запросы с паузой
 * - Лимит контейнеров (MAX_CONTAINERS_FOR_STATS = 10)
 */
export async function getAllContainersMemory(): Promise<AllContainersMemory> {
  const now = Date.now()

  // Проверяем кэш
  if (containersMemoryCache && now - containersMemoryCache.timestamp < CONTAINERS_MEMORY_CACHE_TTL) {
    return containersMemoryCache.data
  }

  try {
    const containers = await docker.listContainers({ all: false }) // Только запущенные

    // Лимитируем количество контейнеров
    const containersToProcess = containers.slice(0, MAX_CONTAINERS_FOR_STATS)

    // Последовательные запросы с паузой
    const containerMemory: ContainerMemory[] = []

    for (const container of containersToProcess) {
      try {
        const containerObj = docker.getContainer(container.Id)
        const stats = await containerObj.stats({ stream: false })

        const memoryUsage = stats.memory_stats.usage || 0
        const memoryLimit = stats.memory_stats.limit || 0
        const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0

        const name = container.Names[0]?.replace(/^\//, '') || container.Id.slice(0, 12)

        containerMemory.push({
          id: container.Id,
          name,
          memoryUsage,
          memoryLimit,
          memoryPercent,
        })

        // Пауза между запросами
        await new Promise((resolve) => setTimeout(resolve, 50))
      } catch {
        // Контейнер мог остановиться
        continue
      }
    }

    const totalDockerMemory = containerMemory.reduce((sum, c) => sum + c.memoryUsage, 0)

    // Сортировка по памяти (убывание)
    containerMemory.sort((a, b) => b.memoryUsage - a.memoryUsage)

    const result: AllContainersMemory = {
      containers: containerMemory,
      totalDockerMemory,
      containerCount: containers.length,
    }

    // Кэшируем
    containersMemoryCache = { data: result, timestamp: now }

    return result
  } catch (error) {
    console.error('[Docker] Error getting all containers memory:', error)
    return {
      containers: [],
      totalDockerMemory: 0,
      containerCount: 0,
    }
  }
}

// =============================================================================
// Images, Volumes, Networks
// =============================================================================

/**
 * Получение списка образов
 */
export async function getImages(): Promise<DockerImage[]> {
  try {
    const images = await docker.listImages()

    return images.map((img) => {
      const repoTag = img.RepoTags?.[0] || '<none>:<none>'
      const [repository, tag] = repoTag.split(':')

      return {
        id: img.Id.replace('sha256:', '').slice(0, 12),
        repository: repository || '<none>',
        tag: tag || '<none>',
        size: img.Size,
        created: img.Created,
      }
    })
  } catch (error) {
    console.error('[Docker] Error getting images:', error)
    throw error
  }
}

/**
 * Получение списка volumes
 */
export async function getVolumes(): Promise<DockerVolume[]> {
  try {
    const response = await docker.listVolumes()

    return (response.Volumes || []).map((vol) => ({
      name: vol.Name,
      driver: vol.Driver,
      mountpoint: vol.Mountpoint,
      scope: vol.Scope,
      createdAt: (vol as { CreatedAt?: string }).CreatedAt || '',
    }))
  } catch (error) {
    console.error('[Docker] Error getting volumes:', error)
    throw error
  }
}

/**
 * Получение списка сетей
 */
export async function getNetworks(): Promise<DockerNetwork[]> {
  try {
    const networks = await docker.listNetworks()

    return networks.map((net) => ({
      id: net.Id?.slice(0, 12) || '',
      name: net.Name || '',
      driver: net.Driver || '',
      scope: net.Scope || '',
      ipam: {
        driver: net.IPAM?.Driver || '',
        config:
          net.IPAM?.Config?.map((c) => ({
            subnet: c.Subnet,
            gateway: c.Gateway,
          })) || [],
      },
      containers: Object.entries(net.Containers || {}).map(([, info]) => ({
        name: (info as { Name: string; IPv4Address: string }).Name,
        ipv4Address: (info as { Name: string; IPv4Address: string }).IPv4Address,
      })),
    }))
  } catch (error) {
    console.error('[Docker] Error getting networks:', error)
    throw error
  }
}

/**
 * Получение статистики использования диска Docker
 */
export async function getDockerDiskUsage(): Promise<DockerDiskUsage> {
  try {
    const df = await docker.df()

    return {
      images: {
        total: df.Images?.length || 0,
        size: df.Images?.reduce((sum: number, img: { Size?: number }) => sum + (img.Size || 0), 0) || 0,
      },
      containers: {
        total: df.Containers?.length || 0,
        size: df.Containers?.reduce((sum: number, c: { SizeRootFs?: number }) => sum + (c.SizeRootFs || 0), 0) || 0,
      },
      volumes: {
        total: df.Volumes?.length || 0,
        size:
          df.Volumes?.reduce(
            (sum: number, v: { UsageData?: { Size?: number } }) => sum + (v.UsageData?.Size || 0),
            0
          ) || 0,
      },
      buildCache: {
        total: df.BuildCache?.length || 0,
        size: df.BuildCache?.reduce((sum: number, b: { Size?: number }) => sum + (b.Size || 0), 0) || 0,
      },
    }
  } catch (error) {
    console.error('[Docker] Error getting disk usage:', error)
    throw error
  }
}

/**
 * Очистка Docker build cache
 */
export async function pruneBuildCache(): Promise<{ spaceReclaimed: number }> {
  try {
    // pruneBuilder — аналог `docker builder prune`
    const result = await (
      docker as unknown as {
        pruneBuilder: (opts?: Record<string, unknown>) => Promise<{ SpaceReclaimed?: number }>
      }
    ).pruneBuilder()
    return { spaceReclaimed: result.SpaceReclaimed || 0 }
  } catch (error) {
    console.error('[Docker] Error pruning build cache:', error)
    throw error
  }
}

/**
 * Очистка неиспользуемых образов Docker
 */
export async function pruneImages(): Promise<{ spaceReclaimed: number }> {
  try {
    const [dangling, unused] = await Promise.all([
      docker.pruneImages({ filters: { dangling: { true: true } } }),
      docker.pruneContainers(),
    ])
    return { spaceReclaimed: (dangling.SpaceReclaimed || 0) + (unused.SpaceReclaimed || 0) }
  } catch (error) {
    console.error('[Docker] Error pruning images:', error)
    throw error
  }
}

/**
 * Полная очистка неиспользуемых ресурсов Docker (контейнеры, образы, тома, сети, build cache)
 */
export async function pruneSystem(): Promise<{ spaceReclaimed: number }> {
  try {
    const [containers, images, volumes, _networks, buildCache] = await Promise.all([
      docker.pruneContainers(),
      docker.pruneImages({ filters: { dangling: { true: true } } }),
      docker.pruneVolumes(),
      docker.pruneNetworks(),
      (
        docker as unknown as {
          pruneBuilder: (opts?: Record<string, unknown>) => Promise<{ SpaceReclaimed?: number }>
        }
      )
        .pruneBuilder()
        .catch(() => ({ SpaceReclaimed: 0 })),
    ])

    const spaceReclaimed =
      (containers.SpaceReclaimed || 0) +
      (images.SpaceReclaimed || 0) +
      (volumes.SpaceReclaimed || 0) +
      (buildCache.SpaceReclaimed || 0)

    return { spaceReclaimed }
  } catch (error) {
    console.error('[Docker] Error pruning system:', error)
    throw error
  }
}
