import { findContainerByName, getLocalClient, LEGACY_CONTAINER_NAME_MAP } from '@/lib/server-client'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/apps/[app]/status
 * Возвращает статус контейнера приложения через dashboard-agent
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params

  const containerName = LEGACY_CONTAINER_NAME_MAP[app]
  if (!containerName) {
    return NextResponse.json({ error: 'Unknown application' }, { status: 404 })
  }

  try {
    const client = getLocalClient()
    const containers = await client.getContainers(true)
    const container = findContainerByName(containers, containerName)

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
