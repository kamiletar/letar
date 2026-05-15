import { requireAdmin } from '@/lib/auth-utils'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/cron/jobs/[id]
 * Возвращает информацию о конкретной задаче
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')

    const { client } = await getClientByServerId(serverId)

    const status = await client.getCronJobStatus(id)
    return NextResponse.json({ success: true, ...status })
  } catch (error) {
    console.error('Ошибка получения задачи:', error)
    if (error instanceof Error && error.message === 'Job not found') {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

/**
 * PATCH /api/cron/jobs/[id]
 * Обновляет задачу (enabled, schedule, description)
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params
    const body = await request.json()

    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')

    // Разрешённые поля для обновления
    const allowedFields = ['enabled', 'schedule', 'description'] as const
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    const { client } = await getClientByServerId(serverId)

    const { job } = await client.updateCronJob(id, updates)
    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Ошибка обновления задачи:', error)
    if (error instanceof Error && error.message === 'Job not found') {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
