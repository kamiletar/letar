/**
 * Подписка/отписка на push-уведомления.
 * POST — создать подписку, DELETE — удалить.
 */

import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'

const SubscribeSchema = z
  .object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  })
  .strip()

/** Получаем сессию через dynamic import чтобы избежать проблем с типами */
async function getSessionUser() {
  const { getSession } = await import('@/lib/auth')
  const session = await getSession()
  return session?.user
}

/** Подписаться на push */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = SubscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректные данные подписки' }, { status: 400 })
    }

    const { endpoint, keys } = parsed.data

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        userId: user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[push/subscribe POST] error:', error)
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Отписаться от push */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
    }

    const body = await request.json()
    const endpoint = body?.endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'Не указан endpoint' }, { status: 400 })
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[push/subscribe DELETE] error:', error)
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
