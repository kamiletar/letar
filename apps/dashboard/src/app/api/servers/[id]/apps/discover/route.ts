/**
 * API: GET /api/servers/[id]/apps/discover
 * Автообнаружение Docker контейнеров на сервере
 */

import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

/**
 * Предложение для добавления приложения
 */
interface DiscoveredApp {
  /** Предлагаемое имя (slug) */
  name: string
  /** Отображаемое имя */
  displayName: string
  /** Имя контейнера */
  containerName: string
  /** Docker образ */
  imageName: string
  /** Порт (если есть) */
  port: number | null
  /** Контейнер запущен */
  isRunning: boolean
  /** Уже добавлено как приложение */
  alreadyAdded: boolean
}

/**
 * Извлечь имя из Docker контейнера
 * driving-school -> Driving School
 * lena-mandala-1 -> Mandala
 */
function formatDisplayName(containerName: string): string {
  // Убираем lena- префикс и -1/-2 суффиксы
  const name = containerName.replace(/^lena-/, '').replace(/-\d+$/, '')
  // Заменяем дефисы на пробелы и капитализируем
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Создать slug из имени контейнера
 */
function formatSlugName(containerName: string): string {
  return containerName.replace(/^lena-/, '').replace(/-\d+$/, '')
}

export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getEnhancedPrisma(session.user)

    // Получаем сервер и его текущие приложения
    const server = await db.server.findUnique({
      where: { id },
      include: {
        apps: {
          select: { containerName: true },
        },
      },
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Получаем клиент для сервера
    const { client } = await getClientByServerId(id)

    // Получаем все контейнеры (включая остановленные)
    const containers = await client.getContainers(true)

    // Существующие имена контейнеров (для фильтрации)
    const existingContainerNames = new Set(server.apps.map((app) => app.containerName).filter(Boolean))

    // Преобразуем в формат DiscoveredApp
    const discoveredApps: DiscoveredApp[] = containers.map((container) => {
      const containerName = container.names?.[0]?.replace(/^\//, '') || container.name || container.id

      // Определяем порт из маппинга
      let port: number | null = null
      if (container.ports && container.ports.length > 0) {
        const firstPort = container.ports.find((p) => p.publicPort && p.privatePort)
        if (firstPort) {
          port = firstPort.publicPort || null
        }
      }

      return {
        name: formatSlugName(containerName),
        displayName: formatDisplayName(containerName),
        containerName,
        imageName: container.image,
        port,
        isRunning: container.state === 'running',
        alreadyAdded: existingContainerNames.has(containerName),
      }
    })

    // Сортируем: сначала запущенные, потом по имени
    discoveredApps.sort((a, b) => {
      if (a.isRunning !== b.isRunning) {
        return a.isRunning ? -1 : 1
      }
      return a.displayName.localeCompare(b.displayName)
    })

    return NextResponse.json(discoveredApps)
  } catch (error) {
    console.error('[API] Error discovering apps:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
