/**
 * API: /api/servers/[id]/apps
 * GET — список приложений сервера
 * POST — создание нового приложения
 */

import type { AppType } from '@/generated/prisma/client'
import { requireAdmin, requireAuth } from '@/lib/auth-utils'
import { getEnhancedPrisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

/**
 * Схема для создания приложения
 */
const createAppSchema = z
  .object({
    name: z.string().min(1).max(100),
    displayName: z.string().min(1).max(200),
    containerName: z.string().min(1).max(200).optional(),
    port: z.number().int().positive().optional(),
    type: z.enum(['WEB', 'CLI', 'SERVICE']).optional(),
    imageName: z.string().max(500).optional(),
  })
  .strip()

/**
 * GET /api/servers/[id]/apps
 * Список приложений сервера
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const user = await requireAuth()

    const db = getEnhancedPrisma(user)

    // Проверяем что сервер существует
    const server = await db.server.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Получаем приложения
    const apps = await db.deployedApp.findMany({
      where: { serverId: id },
      orderBy: [{ port: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        displayName: true,
        containerName: true,
        port: true,
        type: true,
        imageName: true,
        lastDeployed: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(apps)
  } catch (error) {
    console.error('[API] Error getting apps:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/servers/[id]/apps
 * Создание нового приложения (только ADMIN)
 */
export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params
    const user = await requireAdmin()

    const body = await request.json()
    const parsed = createAppSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, displayName, containerName, port, type, imageName } = parsed.data

    const db = getEnhancedPrisma(user)

    // Проверяем что сервер существует
    const server = await db.server.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    // Проверяем уникальность имени на сервере
    const existing = await db.deployedApp.findUnique({
      where: { name_serverId: { name, serverId: id } },
    })

    if (existing) {
      return NextResponse.json({ error: 'App with this name already exists on server' }, { status: 409 })
    }

    // Создаём приложение
    const app = await db.deployedApp.create({
      data: {
        name,
        displayName,
        containerName: containerName || null,
        port: port || null,
        type: (type as AppType) || 'WEB',
        imageName: imageName || null,
        serverId: id,
      },
    })

    return NextResponse.json(app, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating app:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
