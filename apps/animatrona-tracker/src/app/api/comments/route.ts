import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'

const COMMENTS_PER_PAGE = 20

/**
 * GET /api/comments?animeId=xxx&cursor=xxx&limit=20
 * Список комментариев к аниме (top-level + вложенные ответы)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const animeId = searchParams.get('animeId')
  const cursor = searchParams.get('cursor')
  const limit = Math.min(Number(searchParams.get('limit')) || COMMENTS_PER_PAGE, 50)

  if (!animeId) {
    return NextResponse.json({ error: 'animeId обязателен' }, { status: 400 })
  }

  const session = await getSession()
  const db = getEnhancedPrisma(session?.user)

  const comments = await db.animeComment.findMany({
    where: { animeId, parentId: null },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: { id: true, name: true, image: true } },
      replies: {
        take: 5,
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      },
      _count: { select: { replies: true } },
    },
  })

  const hasMore = comments.length > limit
  const items = hasMore ? comments.slice(0, limit) : comments
  const nextCursor = hasMore ? items[items.length - 1]?.id : null

  return NextResponse.json({ data: items, nextCursor })
}

const CreateCommentSchema = z
  .object({
    animeId: z.string().min(1),
    text: z.string().min(1, 'Комментарий не может быть пустым').max(2000, 'Максимум 2000 символов'),
    parentId: z.string().optional(),
  })
  .strip()

/**
 * POST /api/comments
 * Создать комментарий (требует авторизацию)
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = CreateCommentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { animeId, text, parentId } = parsed.data

  // Проверяем что аниме существует и опубликовано
  const anime = await prisma.anime.findFirst({
    where: { id: animeId, status: 'PUBLISHED' },
    select: { id: true },
  })
  if (!anime) {
    return NextResponse.json({ error: 'Аниме не найдено' }, { status: 404 })
  }

  // Если это ответ — проверяем что родительский комментарий существует и top-level
  if (parentId) {
    const parent = await prisma.animeComment.findFirst({
      where: { id: parentId, animeId, parentId: null },
      select: { id: true },
    })
    if (!parent) {
      return NextResponse.json({ error: 'Родительский комментарий не найден' }, { status: 404 })
    }
  }

  const db = getEnhancedPrisma(session.user)
  const comment = await db.animeComment.create({
    data: {
      text,
      animeId,
      authorId: session.user.id,
      parentId: parentId ?? null,
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      },
    },
  })

  return NextResponse.json({ data: comment }, { status: 201 })
}
