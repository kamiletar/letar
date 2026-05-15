import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

/**
 * GET /api/database/[db]/backups
 * Возвращает список всех бэкапов для указанной БД (через агента)
 *
 * Query params:
 * - serverId?: string — ID сервера (по умолчанию локальный агент)
 */
export async function GET(request: Request, { params }: { params: Promise<{ db: string }> }) {
  try {
    const { db } = await params
    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')

    const { client } = await getClientByServerId(serverId)

    const backups = await client.getBackups(db)
    return NextResponse.json({
      success: true,
      count: backups.length,
      backups,
    })
  } catch (error) {
    console.error('Error in /api/database/[db]/backups:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
