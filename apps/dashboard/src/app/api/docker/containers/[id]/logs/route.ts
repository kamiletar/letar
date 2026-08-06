import { getClientByServerId, updateServerLastSeen } from '@/lib/server-client/get-client-by-id'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/docker/containers/[id]/logs
 * Возвращает логи контейнера
 * Поддерживает serverId для получения логов с удалённых серверов
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tail = parseInt(searchParams.get('tail') || '100', 10)
    const serverId = searchParams.get('serverId')

    const { client, server } = await getClientByServerId(serverId)

    const logs = await client.getContainerLogs(id, tail)

    if (server) {
      updateServerLastSeen(server.id)
    }

    return NextResponse.json({
      success: true,
      containerId: id,
      logs: logs.stdout + logs.stderr,
      tail,
    })
  } catch (error) {
    console.error('Error getting container logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
