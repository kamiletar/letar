import { getClientByServerId, updateServerLastSeen } from '@/lib/server-client/get-client-by-id'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/docker/volumes
 * Возвращает список всех Docker volumes
 * Поддерживает serverId для получения volumes с удалённых серверов
 */
export async function GET(request: NextRequest) {
  try {
    const serverId = request.nextUrl.searchParams.get('serverId')
    const { client, server } = await getClientByServerId(serverId)

    const volumes = await client.getVolumes()

    if (server) {
      updateServerLastSeen(server.id)
    }

    return NextResponse.json({
      success: true,
      count: volumes.length,
      volumes,
    })
  } catch (error) {
    console.error('Error in /api/docker/volumes:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
