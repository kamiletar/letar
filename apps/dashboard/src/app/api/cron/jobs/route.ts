import { requireAdmin } from '@/lib/auth-utils'
import { getClientByServerId, updateServerLastSeen } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

/**
 * GET /api/cron/jobs
 * Возвращает список всех cron задач с их статусами
 *
 * Query params:
 * - serverId?: string - ID сервера (опционально, по умолчанию локальный агент)
 */
export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')

    const { client, server } = await getClientByServerId(serverId)

    const response = await client.getCronJobs()

    if (server.id !== 'local') {
      updateServerLastSeen(server.id)
    }

    return NextResponse.json({
      success: true,
      ...response,
    })
  } catch (error) {
    console.error('Ошибка получения cron задач:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cron jobs',
      },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 },
    )
  }
}

/**
 * POST /api/cron/jobs
 * Запускает/останавливает планировщик
 *
 * Query params:
 * - serverId?: string - ID сервера (опционально, по умолчанию локальный агент)
 */
export async function POST(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')

    const body = await request.json()
    const { action } = body as { action: 'start' | 'stop' }

    const { client } = await getClientByServerId(serverId)

    const response = await client.controlCronScheduler(action)
    return NextResponse.json({
      success: true,
      ...response,
    })
  } catch (error) {
    console.error('Ошибка управления планировщиком:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to control cron scheduler',
      },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 },
    )
  }
}
