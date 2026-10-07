/**
 * Все стихи текущего поэта (опубликованные и черновики) — для локальной копии режима чтеца.
 * GET /api/poet/poems
 */

import { prisma } from '@/lib/db'
import { requirePoetAction } from '@/lib/roles'
import { NextResponse } from 'next/server'

/** Личные данные — ни браузер, ни прокси не должны их кэшировать */
const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  let poet
  try {
    const result = await requirePoetAction()
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401, headers: NO_STORE })
    }
    poet = result.poet
  } catch {
    // сессия есть, но пользователь в БД не найден — для клиента это тот же «не вошли»
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: NO_STORE })
  }

  const poems = await prisma.poem.findMany({
    where: { playerId: poet.playerId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, text: true, published: true, updatedAt: true },
  })

  return NextResponse.json(
    {
      poetName: poet.playerName,
      syncedAt: new Date().toISOString(),
      poems: poems.map((poem) => ({ ...poem, updatedAt: poem.updatedAt.toISOString() })),
    },
    { headers: NO_STORE },
  )
}
