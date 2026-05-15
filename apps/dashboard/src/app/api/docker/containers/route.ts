import { getClientByServerId, updateServerLastSeen } from '@/lib/server-client/get-client-by-id'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/docker/containers
 * Возвращает список всех Docker контейнеров через dashboard-agent
 *
 * Query параметры:
 * - serverId: string (опционально) - ID сервера для запроса
 * - all: boolean (по умолчанию true) - включить остановленные контейнеры
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const serverId = searchParams.get('serverId')
    const all = searchParams.get('all') !== 'false'

    const { client, server } = await getClientByServerId(serverId)

    const rawContainers = await client.getContainers(all)

    if (server.id !== 'local') {
      updateServerLastSeen(server.id)
    }

    // Нормализация формата: агент может возвращать PascalCase (dockerode) или camelCase.
    // Стандартизируем на camelCase.
    const containers = (rawContainers as unknown as Array<Record<string, unknown>>).map((c) => ({
      ...c,
      names: Array.isArray(c.names) ? c.names : c.name ? [`/${c.name}`] : [],
      ports: (Array.isArray(c.ports) ? c.ports : []).map((p: Record<string, unknown>) => ({
        privatePort: p.privatePort ?? p.PrivatePort,
        publicPort: p.publicPort ?? p.PublicPort ?? undefined,
        type: p.type ?? p.Type,
      })),
    }))

    return NextResponse.json({
      success: true,
      count: containers.length,
      containers,
    })
  } catch (error) {
    console.error('Error in /api/docker/containers:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
