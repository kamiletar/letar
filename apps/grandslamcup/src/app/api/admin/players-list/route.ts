/**
 * API для получения списка всех игроков (используется в merge UI).
 * Только для администраторов.
 */

import { getDbUser, getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/roles'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getDbUser(session)
    if (!isAdmin(user.roles)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const players = await prisma.player.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        city: { select: { name: true } },
        _count: { select: { playerTeamSeasons: true, performances: true } },
      },
    })

    return NextResponse.json({ players })
  } catch (error) {
    console.error('[players-list] ошибка:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
