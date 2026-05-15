import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { removeDistributionOnline, setDistributionOnline } from '@/lib/redis-distributions'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

type Params = Promise<{ id: string }>

const UpdateDistributionSchema = z
  .object({
    status: z.enum(['ACTIVE', 'PAUSED', 'OFFLINE']).optional(),
  })
  .strip()

/**
 * PATCH /api/distributions/[id]
 * Heartbeat и обновление статуса раздачи.
 *
 * Онлайн-статус хранится в Redis с TTL 1ч — heartbeat продлевает TTL.
 * PostgreSQL обновляется только при смене статуса (PAUSED/OFFLINE).
 */
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const user = await verifyApiKey(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = UpdateDistributionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    // Проверяем что раздача принадлежит пользователю
    const existing = await prisma.distribution.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Раздача не найдена' }, { status: 404 })
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const newStatus = parsed.data.status

    // Heartbeat → Redis SET с TTL (без записи в PostgreSQL)
    if (!newStatus || newStatus === 'ACTIVE') {
      await setDistributionOnline(existing.peerId, existing.cid, {
        distId: existing.id,
        userId: existing.userId,
        animeId: existing.animeId,
        size: existing.size,
      })
    }

    // При смене статуса на PAUSED/OFFLINE — обновляем PostgreSQL + убираем из Redis
    if (newStatus && newStatus !== 'ACTIVE') {
      await prisma.distribution.update({
        where: { id },
        data: { status: newStatus },
      })
      await removeDistributionOnline(existing.peerId, existing.cid)
    }

    return NextResponse.json({
      data: {
        ...existing,
        size: Number(existing.size),
        status: newStatus ?? existing.status,
      },
    })
  } catch (error) {
    console.error('Distribution update error:', error)
    return NextResponse.json({ error: 'Ошибка обновления раздачи' }, { status: 500 })
  }
}
