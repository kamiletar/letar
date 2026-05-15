import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { setDistributionOnline } from '@/lib/redis-distributions'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const CreateDistributionSchema = z
  .object({
    cid: z.string().min(1),
    peerId: z.string().min(1),
    animeId: z.string().optional(),
    size: z.number().int().min(0).optional(),
  })
  .strip()

/**
 * POST /api/distributions
 * Регистрация раздачи от Desktop (API Key auth).
 * Upsert в PostgreSQL + SET в Redis для онлайн-статуса.
 */
export async function POST(request: NextRequest) {
  const user = await verifyApiKey(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = CreateDistributionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { cid, peerId, animeId, size } = parsed.data

  try {
    // Upsert — если раздача с таким cid+peerId уже есть, обновляем
    const distribution = await prisma.distribution.upsert({
      where: { cid_peerId: { cid, peerId } },
      create: {
        cid,
        peerId,
        animeId,
        userId: user.id,
        size: BigInt(size ?? 0),
        status: 'ACTIVE',
      },
      update: {
        status: 'ACTIVE',
        ...(size !== null && size !== undefined && { size: BigInt(size) }),
      },
    })

    // Онлайн-статус в Redis с TTL 1ч
    await setDistributionOnline(peerId, cid, {
      distId: distribution.id,
      userId: user.id,
      animeId: distribution.animeId,
      size: distribution.size,
    })

    return NextResponse.json(
      {
        data: {
          ...distribution,
          size: Number(distribution.size),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Distribution create error:', error)
    return NextResponse.json({ error: 'Ошибка создания раздачи' }, { status: 500 })
  }
}
