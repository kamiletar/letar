import { getClientByServerId, updateServerLastSeen } from '@/lib/server-client/get-client-by-id'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ControlRequest {
  containerId: string
  action: 'start' | 'stop' | 'restart'
  serverId?: string
}

/**
 * POST /api/docker/control
 * Controls a Docker container (start, stop, restart)
 * Поддерживает serverId для управления контейнерами на удалённых серверах
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ControlRequest
    const { containerId, action, serverId } = body

    if (!containerId || !action) {
      return NextResponse.json({ error: 'Missing containerId or action' }, { status: 400 })
    }

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be start, stop, or restart' }, { status: 400 })
    }

    const { client, server } = await getClientByServerId(serverId)

    await client.controlContainer(containerId, action)

    if (server) {
      updateServerLastSeen(server.id)
    }

    return NextResponse.json({
      success: true,
      containerId,
      action,
    })
  } catch (error) {
    console.error('Error controlling container:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to control container',
      },
      { status: 500 },
    )
  }
}
