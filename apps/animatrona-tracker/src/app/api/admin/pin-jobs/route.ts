import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { syncPinJobStatusesThrottled } from '@/lib/pinning'
import { serializeBigIntArray } from '@/lib/serialize'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Приоритет сортировки по статусу:
 * PINNING (активные) → QUEUED (в очереди) → FAILED → PINNED → UNPINNED
 */
const STATUS_PRIORITY: Record<string, number> = {
  PINNING: 0,
  QUEUED: 1,
  FAILED: 2,
  PINNED: 3,
  UNPINNED: 4,
}

/** Сериализация BigInt полей в элементах pin-jobs */
function serializeItems(items: Record<string, unknown>[]) {
  return serializeBigIntArray(items, ['size']).map((item) => ({
    ...item,
    anime: item.anime
      ? {
          ...(item.anime as Record<string, unknown>),
          directorySize: (item.anime as Record<string, unknown>).directorySize
            ? Number((item.anime as Record<string, unknown>).directorySize)
            : null,
        }
      : null,
  }))
}

/**
 * GET /api/admin/pin-jobs
 * Список заданий на пиннинг с offset-пагинацией
 *
 * Режимы:
 * - ?active=true — только активные (PINNING/QUEUED), отсортированные по приоритету
 * - без active — все задания с offset-пагинацией, активные всегда первые
 *
 * Query params:
 *   ?active=true — только активные задания (для частого polling)
 *   ?animeId=    — фильтр по аниме
 *   ?serverId=   — фильтр по серверу
 *   ?status=     — фильтр по статусу
 *   ?offset=     — смещение для пагинации (по умолчанию 0)
 *   ?limit=      — размер страницы (по умолчанию 20, макс 100)
 */
export async function GET(request: NextRequest) {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { db } = auth

  const { searchParams } = request.nextUrl
  const activeOnly = searchParams.get('active') === 'true'
  const animeId = searchParams.get('animeId')
  const serverId = searchParams.get('serverId')
  const status = searchParams.get('status')
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0)
  const limitParam = parseInt(searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(Math.max(limitParam, 1), 100)

  // Динамический фильтр для Prisma/ZenStack where
  const baseWhere: any = {}
  if (animeId) {
    baseWhere.animeId = animeId
  }
  if (serverId) {
    baseWhere.serverId = serverId
  }

  const include = {
    server: { select: { id: true, name: true, status: true } },
    anime: { select: { id: true, title: true, directoryBlocks: true, directorySize: true } },
    createdBy: { select: { id: true, name: true } },
  }

  // Режим: только активные задания (PINNING/QUEUED)
  if (activeOnly) {
    // Автоматический sync с pin-queue/Kubo (throttled, не чаще раза в 30 сек)
    await syncPinJobStatusesThrottled()

    const jobs = await db.pinJob.findMany({
      where: { ...baseWhere, status: { in: ['PINNING', 'QUEUED'] } },
      orderBy: { createdAt: 'asc' },
      include,
    })

    // Сортируем: активная (с прогрессом) первая, затем PINNING, затем QUEUED (FIFO)
    jobs.sort(
      (
        a: { status: string; progressBlocks: number; createdAt: Date },
        b: { status: string; progressBlocks: number; createdAt: Date }
      ) => {
        const activeA = a.status === 'PINNING' && a.progressBlocks > 0 ? 1 : 0
        const activeB = b.status === 'PINNING' && b.progressBlocks > 0 ? 1 : 0
        if (activeA !== activeB) {
          return activeB - activeA
        }
        const pA = STATUS_PRIORITY[a.status] ?? 99
        const pB = STATUS_PRIORITY[b.status] ?? 99
        if (pA !== pB) {
          return pA - pB
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
    )

    return NextResponse.json({ data: serializeItems(jobs) })
  }

  // Режим: фильтр по конкретному статусу
  if (status) {
    const where = { ...baseWhere, status }
    const direction = status === 'PINNING' || status === 'QUEUED' ? 'asc' : 'desc'

    const [jobs, total] = await Promise.all([
      db.pinJob.findMany({
        where,
        orderBy: { createdAt: direction },
        include,
        skip: offset,
        take: limit,
      }),
      db.pinJob.count({ where }),
    ])

    return NextResponse.json({
      data: serializeItems(jobs),
      hasNextPage: offset + jobs.length < total,
      total,
    })
  }

  // Режим: все завершённые (PINNED, FAILED, UNPINNED) с offset-пагинацией
  const where = { ...baseWhere, status: { in: ['PINNED', 'FAILED', 'UNPINNED'] } }

  const [jobs, total] = await Promise.all([
    db.pinJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include,
      skip: offset,
      take: limit,
    }),
    db.pinJob.count({ where }),
  ])

  return NextResponse.json({
    data: serializeItems(jobs),
    hasNextPage: offset + jobs.length < total,
    total,
  })
}
