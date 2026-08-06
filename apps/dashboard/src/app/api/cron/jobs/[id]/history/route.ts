import { requireAdmin } from '@/lib/auth-utils'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/cron/jobs/[id]/history
 * Возвращает историю выполнений задачи
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const { client } = await getClientByServerId(serverId)

    const history = await client.getCronJobHistory(id, limit)
    return NextResponse.json({ success: true, ...history })
  } catch (error) {
    console.error('Ошибка получения истории:', error)
    if (error instanceof Error && error.message === 'Job not found') {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 },
    )
  }
}
