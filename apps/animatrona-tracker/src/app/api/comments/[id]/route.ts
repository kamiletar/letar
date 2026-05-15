import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'

interface RouteParams {
  params: Promise<{ id: string }>
}

const UpdateCommentSchema = z
  .object({
    text: z.string().min(1, 'Комментарий не может быть пустым').max(2000, 'Максимум 2000 символов'),
  })
  .strip()

/**
 * PATCH /api/comments/[id]
 * Редактировать свой комментарий
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = UpdateCommentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const db = getEnhancedPrisma(session.user)

  try {
    const comment = await db.animeComment.update({
      where: { id },
      data: { text: parsed.data.text },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    })
    return NextResponse.json({ data: comment })
  } catch {
    return NextResponse.json({ error: 'Комментарий не найден или нет прав' }, { status: 404 })
  }
}

/**
 * DELETE /api/comments/[id]
 * Удалить комментарий (автор или модератор/админ)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  const { id } = await params
  const db = getEnhancedPrisma(session.user)

  try {
    await db.animeComment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Комментарий не найден или нет прав' }, { status: 404 })
  }
}
