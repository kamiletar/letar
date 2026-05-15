import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

/**
 * GET /api/database/status
 * Возвращает статус всех PostgreSQL контейнеров и подключений
 *
 * Query params:
 * - serverId?: string - ID сервера (по умолчанию локальный агент)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')

    const { client } = await getClientByServerId(serverId)

    const statuses = await client.getDatabaseStatus()
    return NextResponse.json({ success: true, databases: statuses })
  } catch (error) {
    console.error('Error in /api/database/status:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
