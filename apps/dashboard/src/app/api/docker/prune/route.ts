import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import type { RemoteServerClient } from '@/lib/server-client/remote'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/docker/prune
 * Прокси к dashboard-agent POST /api/docker/prune
 * Body: { type?: 'buildCache' | 'images' | 'system', serverId?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}))
    const type = ((body as { type?: string }).type ?? 'system') as 'buildCache' | 'images' | 'system'
    const serverId = (body as { serverId?: string }).serverId ?? null

    const { client } = await getClientByServerId(serverId)
    const result = await (client as RemoteServerClient).dockerPrune(type)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error in POST /api/docker/prune:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to prune' }, { status: 500 })
  }
}
