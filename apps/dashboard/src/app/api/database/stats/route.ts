import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

/**
 * GET /api/database/stats
 * Возвращает статистику всех баз данных
 *
 * Query параметры:
 * - serverId?: string - ID сервера (по умолчанию локальный агент)
 * - db?: string - имя конкретной БД (опционально)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')
    const dbName = searchParams.get('db')

    const { client } = await getClientByServerId(serverId)

    const stats = await client.getDatabaseStats(dbName || undefined)
    return NextResponse.json({ success: true, databases: stats })
  } catch (error) {
    console.error('Error in /api/database/stats:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
