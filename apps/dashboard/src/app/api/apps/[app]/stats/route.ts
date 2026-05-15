import { getLocalClient } from '@/lib/server-client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CONTAINER_NAME_MAP: Record<string, string> = {
  'premium-rosstil': 'premium-rosstil-app',
  imot: 'imot-app',
  dashboard: 'dashboard-app',
  'driving-school': 'driving-school-app',
  mandala: 'mandala-app',
  kami: 'kami-app',
}

/**
 * GET /api/apps/[app]/stats
 * Возвращает статистику использования ресурсов контейнера через dashboard-agent
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params

  const containerName = CONTAINER_NAME_MAP[app]
  if (!containerName) {
    return NextResponse.json({ error: 'Unknown application' }, { status: 404 })
  }

  try {
    const client = getLocalClient()
    const containers = await client.getContainers(true)
    const container = containers.find((c) => c.names?.some((n) => n === `/${containerName}` || n === containerName))

    if (!container) {
      return NextResponse.json({ error: 'Container not found or not running' }, { status: 404 })
    }

    const stats = await client.getContainerStats(container.id)

    return NextResponse.json({
      cpu: {
        usage: parseFloat(stats.cpuPercent ?? '0'),
        cores: 1,
      },
      memory: {
        usage: stats.memoryUsage,
        limit: stats.memoryLimit,
        percentage: parseFloat(stats.memoryPercent ?? '0'),
      },
      network: {
        rx: stats.networkRx,
        tx: stats.networkTx,
      },
      blockIO: {
        read: stats.blockRead,
        write: stats.blockWrite,
      },
    })
  } catch (error) {
    console.error(`Error getting stats for app ${app}:`, error)
    return NextResponse.json({ error: 'Failed to get container stats' }, { status: 500 })
  }
}
