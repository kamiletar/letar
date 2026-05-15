/**
 * API: POST /api/servers/[id]/deploy/cancel
 * Отмена текущего деплоя
 */

import { getServerSession } from '@/lib/auth'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export async function POST(_request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { client, server } = await getClientByServerId(id)

    // Для удалённых серверов — отправляем запрос на отмену
    if (!server?.isLocal && 'cancelDeploy' in client) {
      const result = await (client as { cancelDeploy: () => Promise<{ cancelled: boolean }> }).cancelDeploy()
      return NextResponse.json(result)
    }

    // Для локального сервера — нет механизма отмены
    return NextResponse.json({
      cancelled: false,
      error: 'Cancel not supported for local server',
    })
  } catch (error) {
    console.error('[API] Error cancelling deploy:', error)
    const errorMsg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
