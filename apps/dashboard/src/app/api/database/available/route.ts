import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface AvailableDatabasesResponse {
  success: boolean
  databases: string[]
  server: string
  error?: string
}

/**
 * GET /api/database/available
 * Возвращает список БД доступных на выбранном сервере (через агента)
 *
 * Query params:
 * - serverId?: string - ID сервера (по умолчанию локальный агент)
 */
export async function GET(request: Request): Promise<NextResponse<AvailableDatabasesResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')

    const { client, server } = await getClientByServerId(serverId)

    const statuses = await client.getDatabaseStatus()
    const databases = statuses.map((s) => s.name)

    return NextResponse.json({
      success: true,
      databases,
      server: server.name,
    })
  } catch (error) {
    console.error('Error in /api/database/available:', error)
    return NextResponse.json({
      success: false,
      databases: [],
      server: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
