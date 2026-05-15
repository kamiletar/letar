/**
 * POST /api/players/claim-profile — заявка на привязку профиля поэта.
 * НЕ привязывает мгновенно — ставит pendingUserId.
 * Тренер/организатор/админ подтверждает через модерацию.
 */

import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const Schema = z.object({ playerId: z.string().min(1) }).strip()

export async function POST(request: NextRequest) {
  try {
    const { getSession } = await import('@/lib/auth')
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
    }

    const { playerId } = parsed.data
    const userId = session.user.id

    // Проверка: у пользователя ещё нет привязанного профиля
    const existingPlayer = await prisma.player.findFirst({
      where: { OR: [{ userId }, { pendingUserId: userId }] },
    })
    if (existingPlayer) {
      return NextResponse.json({ error: 'У вас уже есть привязанный или ожидающий профиль' }, { status: 400 })
    }

    // Проверка: поэт ещё не привязан и нет pending заявки
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { userId: true, pendingUserId: true },
    })
    if (!player) {
      return NextResponse.json({ error: 'Поэт не найден' }, { status: 404 })
    }
    if (player.userId) {
      return NextResponse.json({ error: 'Профиль уже привязан к другому аккаунту' }, { status: 400 })
    }
    if (player.pendingUserId) {
      return NextResponse.json({ error: 'На этот профиль уже есть заявка' }, { status: 400 })
    }

    // Создаём заявку (pendingUserId), а не мгновенную привязку
    await prisma.player.update({
      where: { id: playerId },
      data: { pendingUserId: userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/players/claim-profile]', error)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
