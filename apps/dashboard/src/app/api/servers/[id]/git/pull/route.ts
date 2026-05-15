/**
 * API: POST /api/servers/[id]/git/pull
 * Выполнить git pull на удалённом сервере
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

    const { client, server } = await getClientByServerId(id)

    // Git методы доступны только для удалённых серверов
    if (server?.isLocal || !client.gitPull) {
      return NextResponse.json({ error: 'Git pull not available for this server' }, { status: 400 })
    }

    const data = await client.gitPull()

    return NextResponse.json({
      success: data.success,
      upToDate: data.upToDate,
      output: data.output,
    })
  } catch (error) {
    console.error('[API] Error executing git pull:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
