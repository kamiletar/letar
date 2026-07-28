/**
 * GET /api/docker/containers/by-name/[name]/status
 * Возвращает статус контейнера по имени
 *
 * Query параметры:
 * - serverId: string (опционально) - ID сервера для запроса
 */

import { findContainerByName } from '@/lib/server-client'
import { getClientByServerId, updateServerLastSeen } from '@/lib/server-client/get-client-by-id'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Params = Promise<{ name: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { name } = await params
    const { searchParams } = request.nextUrl
    const serverId = searchParams.get('serverId')

    const { client, server } = await getClientByServerId(serverId)

    // Получаем все контейнеры и ищем по имени
    const containers = await client.getContainers(true)

    if (server.id !== 'local') {
      updateServerLastSeen(server.id)
    }

    // Ищем контейнер по имени (Docker API: names=["/name"], agent: name="name") — точное
    // совпадение или префикс <name>- (rollout-мигрированные приложения без container_name, §18.6)
    const container = findContainerByName(containers, name)

    if (!container) {
      return NextResponse.json({ running: false, found: false })
    }

    const isRunning = container.state === 'running'

    const response: {
      running: boolean
      found: boolean
      uptime?: number
      state?: string
    } = {
      running: isRunning,
      found: true,
      state: container.state,
    }

    if (isRunning && container.created) {
      response.uptime = Math.floor(Date.now() / 1000 - container.created)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in /api/docker/containers/by-name/[name]/status:', error)
    return NextResponse.json(
      { running: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
