import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/moderation-log
 * Получить аудит-лог модерации с cursor-пагинацией.
 *
 * Query params:
 * - cursor: ID последней записи (для пагинации)
 * - limit: количество записей (по умолчанию 50, макс 100)
 * - action: фильтр по действию (approve | reject | approve_replacement)
 * - moderatorId: фильтр по модератору
 */
export async function GET(request: NextRequest) {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { db } = auth

  const { searchParams } = request.nextUrl
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const action = searchParams.get('action')
  const moderatorId = searchParams.get('moderatorId')

  // Фильтры
  const where: Record<string, unknown> = {}
  if (action) {
    where.action = action
  }
  if (moderatorId) {
    where.moderatorId = moderatorId
  }

  const logs = await db.moderationLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // +1 для определения hasMore
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      animeId: true,
      animeTitle: true,
      details: true,
      createdAt: true,
      moderator: {
        select: { id: true, name: true, image: true },
      },
    },
  })

  const hasMore = logs.length > limit
  if (hasMore) {
    logs.pop()
  }

  const nextCursor = hasMore && logs.length > 0 ? logs[logs.length - 1].id : null

  return NextResponse.json({
    data: {
      logs,
      nextCursor,
      hasMore,
    },
  })
}
