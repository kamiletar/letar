import { getLocalClient } from '@/lib/server-client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Маппинг имён приложений → имена контейнеров
const CONTAINER_NAME_MAP: Record<string, string> = {
  'premium-rosstil': 'premium-rosstil-app',
  imot: 'imot-app',
  dashboard: 'dashboard-app',
  'driving-school': 'driving-school-app',
  mandala: 'mandala-app',
  kami: 'kami-app',
}

/**
 * GET /api/apps/[app]/status
 * Возвращает статус контейнера приложения через dashboard-agent
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
      return NextResponse.json({ running: false, found: false })
    }

    return NextResponse.json({
      running: container.state === 'running',
      found: true,
      state: container.state,
      status: container.status,
    })
  } catch (error) {
    console.error(`Error getting status for app ${app}:`, error)
    return NextResponse.json({ error: 'Failed to get container status' }, { status: 500 })
  }
}
