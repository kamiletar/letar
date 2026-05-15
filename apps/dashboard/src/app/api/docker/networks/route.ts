import { getClientByServerId, updateServerLastSeen } from '@/lib/server-client/get-client-by-id'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/docker/networks
 * Возвращает список всех Docker networks
 * Поддерживает serverId для получения networks с удалённых серверов
 */
export async function GET(request: NextRequest) {
  try {
    const serverId = request.nextUrl.searchParams.get('serverId')
    const { client, server } = await getClientByServerId(serverId)

    const networks = await client.getNetworks()

    if (server) {
      updateServerLastSeen(server.id)
    }

    return NextResponse.json({
      success: true,
      count: networks.length,
      networks,
    })
  } catch (error) {
    console.error('Error in /api/docker/networks:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
