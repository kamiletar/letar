import { findContainerByName, getLocalClient } from '@/lib/server-client'
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
 * GET /api/apps/[app]/logs
 * Возвращает последние логи контейнера через dashboard-agent
 * Примечание: live streaming недоступен через agent API, возвращается snapshot
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params
  const { searchParams } = request.nextUrl
  const tail = parseInt(searchParams.get('tail') || '100')

  const containerName = CONTAINER_NAME_MAP[app]
  if (!containerName) {
    return NextResponse.json({ error: 'Unknown application' }, { status: 404 })
  }

  try {
    const client = getLocalClient()
    const containers = await client.getContainers(true)
    const container = findContainerByName(containers, containerName)

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 })
    }

    const logs = await client.getContainerLogs(container.id, tail)

    return NextResponse.json({
      stdout: logs.stdout,
      stderr: logs.stderr,
    })
  } catch (error) {
    console.error(`Error getting logs for app ${app}:`, error)
    return NextResponse.json({ error: 'Failed to get container logs' }, { status: 500 })
  }
}
