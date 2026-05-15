import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/users
 * Получить список пользователей с пагинацией и статистикой.
 *
 * Query params:
 * - page: номер страницы (по умолчанию 1)
 * - limit: количество записей (по умолчанию 50, макс 100)
 * - q: поиск по имени/email
 * - role: фильтр по роли (USER | MODERATOR | ADMIN)
 */
export async function GET(request: NextRequest) {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { db } = auth

  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const q = searchParams.get('q')
  const role = searchParams.get('role')

  // Фильтры
  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }]
  }
  if (role) {
    where.role = role
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            anime: true,
            apiKeys: true,
            libraryItems: true,
          },
        },
      },
    }),
    db.user.count({ where }),
  ])

  return NextResponse.json({
    data: users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
