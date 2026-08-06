import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { moderateOneAnime, type ModerationAction } from '@/lib/moderation'
import { autoPinAnime } from '@/lib/pinning'
import { revalidatePath } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const BatchModerateSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        action: z.enum(['approve', 'reject', 'approve_replacement']),
        pin: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(50),
})

/**
 * POST /api/admin/moderate-anime/batch
 * Batch-модерация: обрабатывает массив аниме за один запрос.
 * Один auth check, последовательная обработка, один revalidatePath.
 */
export async function POST(request: NextRequest) {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { session, db } = auth

  const body = await request.json()
  const parsed = BatchModerateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const results: Array<{ id: string; success: boolean; status?: string; error?: string }> = []
  const pinQueue: string[] = []
  let needsRevalidate = false

  // Последовательная обработка — не создаёт давления на DB pool
  for (const item of parsed.data.items) {
    const result = await moderateOneAnime(db, item.id, item.action as ModerationAction, {
      moderatorId: session.user.id,
    })
    results.push({ id: result.id, success: result.success, status: result.status, error: result.error })

    if (result.success) {
      if (result.needsRevalidate) {
        needsRevalidate = true
      }
      // Собираем ID для пиннинга (только ADMIN может пинить)
      if (item.pin && session.user.role === 'ADMIN') {
        pinQueue.push(item.id)
      }
    }
  }

  // Один revalidatePath вместо N
  if (needsRevalidate) {
    revalidatePath('/anime')
    revalidatePath('/')
  }

  // Пиннинг — fire-and-forget, последовательно в фоне (не блокирует ответ)
  const pinStarted = pinQueue.length
  if (pinQueue.length > 0) {
    const userId = session.user.id
    // Запускаем последовательный пиннинг в фоне — не ждём завершения
    void (async () => {
      for (const animeId of pinQueue) {
        try {
          await autoPinAnime(animeId, userId)
        } catch (err) {
          console.error(`[batch-pin] Ошибка аниме ${animeId}:`, err)
        }
      }
    })()
  }

  const successCount = results.filter((r) => r.success).length
  const errorCount = results.length - successCount

  return NextResponse.json({
    data: { results, pinStarted, successCount, errorCount },
  })
}
