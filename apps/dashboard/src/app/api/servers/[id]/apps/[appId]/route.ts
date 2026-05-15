/**
 * API: /api/servers/[id]/apps/[appId]
 * GET — получение приложения
 * PATCH — обновление приложения
 * DELETE — удаление приложения
 */

import type { AppType } from '@/generated/prisma/client'
import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string; appId: string }>

/**
 * Схема для обновления приложения
 */
const updateAppSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    displayName: z.string().min(1).max(200).optional(),
    containerName: z.string().max(200).nullable().optional(),
    port: z.number().int().positive().nullable().optional(),
    type: z.enum(['WEB', 'CLI', 'SERVICE']).optional(),
    imageName: z.string().max(500).nullable().optional(),
  })
  .strip()

/**
 * GET /api/servers/[id]/apps/[appId]
 * Получение приложения
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { id, appId } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getEnhancedPrisma(session.user)

    const app = await db.deployedApp.findFirst({
      where: { id: appId, serverId: id },
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
    })

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    return NextResponse.json(app)
  } catch (error) {
    console.error('[API] Error getting app:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/servers/[id]/apps/[appId]
 * Обновление приложения (только ADMIN)
 */
export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { id, appId } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateAppSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const db = getEnhancedPrisma(session.user)

    // Проверяем что приложение существует
    const existing = await db.deployedApp.findFirst({
      where: { id: appId, serverId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    // Если меняется имя, проверяем уникальность
    if (data.name && data.name !== existing.name) {
      const duplicate = await db.deployedApp.findUnique({
        where: { name_serverId: { name: data.name, serverId: id } },
      })
      if (duplicate) {
        return NextResponse.json({ error: 'App with this name already exists on server' }, { status: 409 })
      }
    }

    // Обновляем
    const app = await db.deployedApp.update({
      where: { id: appId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.containerName !== undefined && { containerName: data.containerName }),
        ...(data.port !== undefined && { port: data.port }),
        ...(data.type !== undefined && { type: data.type as AppType }),
        ...(data.imageName !== undefined && { imageName: data.imageName }),
      },
    })

    return NextResponse.json(app)
  } catch (error) {
    console.error('[API] Error updating app:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/servers/[id]/apps/[appId]
 * Удаление приложения (только ADMIN)
 */
export async function DELETE(_request: Request, { params }: { params: Params }) {
  try {
    const { id, appId } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getEnhancedPrisma(session.user)

    // Проверяем что приложение существует
    const existing = await db.deployedApp.findFirst({
      where: { id: appId, serverId: id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    await db.deployedApp.delete({ where: { id: appId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting app:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
