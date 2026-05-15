import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import type { RemoteServerClient } from '@/lib/server-client/remote'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/system/history
 * Прокси к dashboard-agent /api/system/history
 * Возвращает историю CPU/memory/disk метрик
 * Query: hours=N, combined=true, serverId=<id>
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl
    const hours = parseInt(searchParams.get('hours') ?? '24', 10)
    const serverId = searchParams.get('serverId')

    const { client } = await getClientByServerId(serverId)
    const data = await (client as RemoteServerClient).getSystemHistory(hours)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in /api/system/history:', error)
    // Возвращаем пустую историю вместо ошибки — chart покажет пустой график
    return NextResponse.json({
      tier: '24h',
      hours: 24,
      pointsCount: 0,
      stats: null,
      data: { cpu: [], memory: [], disk: [] },
      timeRange: { from: null, to: null },
    })
  }
}
