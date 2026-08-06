import { formatBytes } from '@/lib/format'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import type { RemoteServerClient } from '@/lib/server-client/remote'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Монтирования которые нужно исключить из списка дисков хоста
 * Это bind mounts (секреты, tmpfs и т.п.) — не реальные диски
 */
function isRealFilesystem(mount: string): boolean {
  if (mount.startsWith('/secrets/')) {
    return false
  }
  if (mount.startsWith('/proc/')) {
    return false
  }
  if (mount.startsWith('/sys/')) {
    return false
  }
  if (mount.startsWith('/dev/')) {
    return false
  }
  if (mount.startsWith('/run/')) {
    return false
  }
  if (mount.endsWith('.env')) {
    return false
  }
  return true
}

/**
 * GET /api/system/disk-usage
 * Прокси к dashboard-agent /api/system/disk + /api/docker/disk-usage
 * Формирует DiskUsageData с хостовыми дисками и Docker статистикой
 * Query: serverId=<id>
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl
    const serverId = searchParams.get('serverId')

    const { client } = await getClientByServerId(serverId)
    const remoteClient = client as RemoteServerClient

    const [allDisks, dockerDf] = await Promise.all([
      remoteClient.getDiskInfo(),
      remoteClient.getDockerDiskUsage().catch(() => null),
    ])

    // Фильтруем реальные файловые системы (убираем bind mounts секретов и т.п.)
    const disks = allDisks.filter((d) => isRealFilesystem(d.mount))

    // Находим основной диск (/) для итоговых цифр
    const rootDisk = disks.find((d) => d.mount === '/') ?? disks[0]
    const totalSize = rootDisk?.size ?? 0
    const usedSize = rootDisk?.used ?? 0
    const usedPercent = rootDisk ? (rootDisk.usedPercent ?? rootDisk.use ?? 0) : 0

    // Преобразуем в HostDisk формат (ожидается компонентом DiskUsage)
    const hostDisks = disks.map((d) => ({
      filesystem: d.fs,
      size: d.size,
      used: d.used,
      available: d.available,
      usePercent: d.usedPercent ?? d.use ?? 0,
      mount: d.mount,
      sizeHuman: formatBytes(d.size),
      usedHuman: formatBytes(d.used),
      availableHuman: formatBytes(d.available),
    }))

    // Формируем Docker disk usage в формате который ожидает компонент DiskUsage
    let docker:
      | {
        images: { total: number; totalHuman: string; count: number; percent: number; details: [] }
        containers: { total: number; totalHuman: string; count: number; percent: number; details: [] }
        volumes: { total: number; totalHuman: string; count: number; percent: number; details: [] }
        buildCache: { total: number; totalHuman: string; count: number; percent: number; details: [] }
        totalSize: number
        totalSizeHuman: string
        totalPercent: number
      }
      | undefined = undefined
    if (dockerDf) {
      const totalDockerSize = dockerDf.images.size + dockerDf.containers.size + dockerDf.volumes.size
        + dockerDf.buildCache.size
      const diskSize = totalSize || 1

      docker = {
        images: {
          total: dockerDf.images.size,
          totalHuman: formatBytes(dockerDf.images.size),
          count: dockerDf.images.total,
          percent: (dockerDf.images.size / diskSize) * 100,
          details: [],
        },
        containers: {
          total: dockerDf.containers.size,
          totalHuman: formatBytes(dockerDf.containers.size),
          count: dockerDf.containers.total,
          percent: (dockerDf.containers.size / diskSize) * 100,
          details: [],
        },
        volumes: {
          total: dockerDf.volumes.size,
          totalHuman: formatBytes(dockerDf.volumes.size),
          count: dockerDf.volumes.total,
          percent: (dockerDf.volumes.size / diskSize) * 100,
          details: [],
        },
        buildCache: {
          total: dockerDf.buildCache.size,
          totalHuman: formatBytes(dockerDf.buildCache.size),
          count: dockerDf.buildCache.total,
          percent: (dockerDf.buildCache.size / diskSize) * 100,
          details: [],
        },
        totalSize: totalDockerSize,
        totalSizeHuman: formatBytes(totalDockerSize),
        totalPercent: (totalDockerSize / diskSize) * 100,
      }
    }

    return NextResponse.json({
      disks,
      hostDisks,
      analyzedPath: '/',
      totalSize,
      totalSizeHuman: formatBytes(totalSize),
      usedSize,
      usedSizeHuman: formatBytes(usedSize),
      usedPercent,
      docker,
    })
  } catch (error) {
    console.error('Error in /api/system/disk-usage:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
