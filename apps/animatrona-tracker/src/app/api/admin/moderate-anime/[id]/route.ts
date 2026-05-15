import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { moderateOneAnime } from '@/lib/moderation'
import { autoPinAnime } from '@/lib/pinning'
import { revalidatePath } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const ModerateAnimeSchema = z.object({
  action: z.enum(['approve', 'reject', 'approve_replacement']),
  pin: z.boolean().optional(),
})

type Params = Promise<{ id: string }>

/**
 * POST /api/admin/moderate-anime/[id]
 * Модерировать одно аниме. Для массовой модерации используй batch endpoint.
 */
export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { session, db } = auth

  const body = await request.json()
  const parsed = ModerateAnimeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const result = await moderateOneAnime(db, id, parsed.data.action, { moderatorId: session.user.id })

  if (!result.success) {
    const status = result.error === 'Аниме не найдено' ? 404 : 400
    return NextResponse.json({ error: result.error }, { status })
  }

  // Автопиннинг при запросе (только ADMIN)
  if (parsed.data.pin && session.user.role === 'ADMIN') {
    autoPinAnime(id, session.user.id).catch((err) => {
      console.error(`[auto-pin] Ошибка аниме ${id}:`, err)
    })
  }

  // Инвалидируем кэш при публикации
  if (result.needsRevalidate) {
    revalidatePath('/anime')
    revalidatePath('/')
  }

  return NextResponse.json({ data: { id: result.id, status: result.status } })
}
