import { logFailure, logSuccess } from '@/lib/audit-log'
import { requireAdmin } from '@/lib/auth-utils'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/cron/jobs/[id]/run
 * Ручной запуск cron задачи
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAdmin()
    const { id } = await context.params

    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')

    const { client, server } = await getClientByServerId(serverId)

    const { result } = await client.runCronJob(id)

    if (result.status === 'success') {
      await logSuccess(user.username, user.role, 'CRON_RUN', id, {
        server: server.name,
        duration: result.duration,
      })
    } else {
      await logFailure(user.username, user.role, 'CRON_RUN', result.error || 'Unknown error', id, {
        server: server.name,
        duration: result.duration,
      })
    }

    return NextResponse.json({
      success: result.status === 'success',
      result,
    })
  } catch (error) {
    console.error('Ошибка запуска задачи:', error)
    if (error instanceof Error && error.message === 'Job not found') {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 },
    )
  }
}
