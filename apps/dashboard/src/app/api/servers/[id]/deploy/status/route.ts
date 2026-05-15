/**
 * API: GET /api/servers/[id]/deploy/status
 * Проксирует статус деплоя с dashboard-agent
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

    // Для удалённых серверов — запрашиваем статус с agent
    if (!server?.isLocal && 'getDeployStatus' in client) {
      const status = await (client as { getDeployStatus: () => Promise<unknown> }).getDeployStatus()
      return NextResponse.json(status)
    }

    // Для локального сервера — нет real-time статуса
    return NextResponse.json({
      running: false,
      output: [],
    })
  } catch (error) {
    console.error('[API] Error getting deploy status:', error)
    const errorMsg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
