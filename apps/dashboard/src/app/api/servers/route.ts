/**
 * API: GET /api/servers
 * Получение списка серверов для мониторинга
 */

import { requireAdmin, requireAuth } from '@/lib/auth-utils'
import { getEnhancedPrisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const user = await requireAuth()

    const db = getEnhancedPrisma(user)

    const servers = await db.server.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        displayName: true,
        host: true,
        port: true,
        isLocal: true,
        isActive: true,
        // SECURITY: agentToken и npmPassword не возвращаются в API ответах
        lastSeen: true,
        npmUrl: true,
        npmEmail: true,
        apps: {
          select: {
            id: true,
            name: true,
            displayName: true,
            containerName: true,
            port: true,
            type: true,
            imageName: true,
            lastDeployed: true,
          },
          orderBy: { port: 'asc' },
        },
      },
    })

    return NextResponse.json(servers)
  } catch (error) {
    console.error('[API] Error getting servers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * API: POST /api/servers
 * Создание нового сервера (только ADMIN)
 */
export async function POST(request: Request) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const { name, displayName, host, port, isLocal, agentToken, npmUrl, npmEmail, npmPassword } = body

    if (!name || !displayName || !host) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = getEnhancedPrisma(user)

    const server = await db.server.create({
      data: {
        name,
        displayName,
        host,
        port: port || 3100,
        isLocal: isLocal || false,
        agentToken: agentToken || null,
        npmUrl: npmUrl || null,
        npmEmail: npmEmail || null,
        npmPassword: npmPassword || null,
        isActive: true,
      },
    })

    return NextResponse.json(server, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating server:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
