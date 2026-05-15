import { isAuthError, requireAdmin, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { serializeBigIntArray, serializeBigIntFields } from '@/lib/serialize'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

/**
 * GET /api/admin/pin-servers
 * Список пин-серверов (для модераторов и админов)
 */
export async function GET() {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { db } = auth

  const servers = await db.pinServer.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { pinJobs: true } },
    },
  })

  return NextResponse.json({ data: serializeBigIntArray(servers, ['capacityBytes', 'usedBytes']) })
}

const CreateServerSchema = z
  .object({
    name: z.string().min(1).max(100),
    apiUrl: z.url(),
    peerId: z.string().optional(),
    authSecret: z.string().optional(),
    capacityBytes: z.number().int().min(0).optional(),
  })
  .strip()

/**
 * POST /api/admin/pin-servers
 * Добавить пин-сервер (только админ)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const body = await request.json()
  const parsed = CreateServerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const server = await prisma.pinServer.create({
      data: {
        name: parsed.data.name,
        apiUrl: parsed.data.apiUrl,
        peerId: parsed.data.peerId,
        authSecret: parsed.data.authSecret,
        capacityBytes: BigInt(parsed.data.capacityBytes ?? 0),
      },
    })

    return NextResponse.json({ data: serializeBigIntFields(server, ['capacityBytes', 'usedBytes']) }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Сервер с таким URL уже существует' }, { status: 409 })
  }
}
