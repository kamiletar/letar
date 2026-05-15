/**
 * API: GET /api/apps/list
 * Получение списка приложений из БД
 * Поддерживает фильтрацию по serverId
 */

import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getEnhancedPrisma(session.user)

    // Опциональная фильтрация по серверу
    const serverId = request.nextUrl.searchParams.get('serverId')
    const all = request.nextUrl.searchParams.get('all') === 'true'

    const apps = await db.deployedApp.findMany({
      where: all ? {} : serverId ? { serverId } : { server: { isLocal: true } },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            displayName: true,
            isLocal: true,
          },
        },
      },
      orderBy: [{ server: { sortOrder: 'asc' } }, { port: 'asc' }],
    })

    // Трансформируем в формат, совместимый со старым API
    const data = apps.map((app) => ({
      name: app.name,
      displayName: app.displayName,
      port: app.port,
      domain: app.domain,
      hasDocker: !!app.containerName,
      containerName: app.containerName,
      type: app.type.toLowerCase() as 'web' | 'cli' | 'service',
      // Добавляем информацию о сервере
      serverId: app.serverId,
      serverName: app.server.name,
      serverDisplayName: app.server.displayName,
      isLocal: app.server.isLocal,
    }))

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('[API] Error getting apps:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
