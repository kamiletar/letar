/**
 * API: /api/servers/[id]
 * PATCH — обновление сервера
 * DELETE — удаление сервера
 */

import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

/**
 * PATCH /api/servers/[id]
 * Обновление сервера (только ADMIN)
 */
export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, displayName, host, port, isActive, agentToken, npmUrl, npmEmail, npmPassword } = body

    const db = getEnhancedPrisma(session.user)

    // Проверяем что сервер существует
    const existing = await db.server.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Для локального сервера разрешаем редактировать только NPM credentials
    const data = existing.isLocal
      ? {
          // Локальный сервер: только NPM поля
          ...(npmUrl !== undefined && { npmUrl: npmUrl || null }),
          ...(npmEmail !== undefined && { npmEmail: npmEmail || null }),
          ...(npmPassword !== undefined && { npmPassword: npmPassword || null }),
        }
      : {
          // Удалённый сервер: все поля
          ...(name !== undefined && { name }),
          ...(displayName !== undefined && { displayName }),
          ...(host !== undefined && { host }),
          ...(port !== undefined && { port }),
          ...(isActive !== undefined && { isActive }),
          ...(agentToken !== undefined && { agentToken }),
          ...(npmUrl !== undefined && { npmUrl: npmUrl || null }),
          ...(npmEmail !== undefined && { npmEmail: npmEmail || null }),
          ...(npmPassword !== undefined && { npmPassword: npmPassword || null }),
        }

    const server = await db.server.update({
      where: { id },
      data,
    })

    return NextResponse.json(server)
  } catch (error) {
    console.error('[API] Error updating server:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/servers/[id]
 * Проверка health сервера
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getEnhancedPrisma(session.user)

    const server = await db.server.findUnique({
      where: { id },
      select: {
        id: true,
        host: true,
        port: true,
        isLocal: true,
        agentToken: true,
      },
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Локальный сервер всегда онлайн
    if (server.isLocal) {
      return NextResponse.json({ online: true, isLocal: true })
    }

    // Проверяем health удалённого агента
    try {
      const baseUrl = `http://${server.host}:${server.port}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(`${baseUrl}/health`, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${server.agentToken}`,
        },
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        // Обновляем lastSeen (игнорируем ошибку access policy для не-админов)
        try {
          await db.server.update({
            where: { id },
            data: { lastSeen: new Date() },
          })
        } catch {
          // Не критично — пользователь может не иметь прав на update
        }
        return NextResponse.json({ online: true })
      }

      return NextResponse.json({ online: false, status: res.status })
    } catch (error) {
      console.error(`[API] Health check failed for ${server.host}:${server.port}:`, error)
      return NextResponse.json({ online: false, error: 'Connection failed' })
    }
  } catch (error) {
    console.error('[API] Error checking server health:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/servers/[id]
 * Удаление сервера (только ADMIN)
 */
export async function DELETE(_request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getEnhancedPrisma(session.user)

    // Проверяем что сервер существует
    const existing = await db.server.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Нельзя удалить локальный сервер
    if (existing.isLocal) {
      return NextResponse.json({ error: 'Cannot delete local server' }, { status: 400 })
    }

    await db.server.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting server:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
