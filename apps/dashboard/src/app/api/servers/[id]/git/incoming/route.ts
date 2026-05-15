/**
 * API: GET /api/servers/[id]/git/incoming
 * Получить входящие коммиты на удалённом сервере
 */

import { getServerSession } from '@/lib/auth'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { client, server } = await getClientByServerId(id)

    // Git методы доступны только для удалённых серверов
    if (server?.isLocal || !client.getGitIncoming) {
      return NextResponse.json({ error: 'Git incoming not available for this server' }, { status: 400 })
    }

    const data = await client.getGitIncoming()

    return NextResponse.json({
      success: true,
      ...data,
    })
  } catch (error) {
    console.error('[API] Error getting git incoming:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
