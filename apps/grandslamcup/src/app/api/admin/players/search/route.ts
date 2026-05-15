/**
 * Поиск игроков по имени для autocomplete в админке.
 * GET /api/admin/players/search?q=...
 */

import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/roles'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { getSession, getDbUser } = await import('@/lib/auth')
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }
  const user = await getDbUser(session)
  if (!isAdmin(user.roles)) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const players = await prisma.player.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    select: {
      id: true,
      name: true,
      slug: true,
      city: { select: { name: true } },
    },
    take: 10,
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(players)
}
