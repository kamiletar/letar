'use server'

import { getSession } from '@/lib/auth'
import { getPrisma } from '@/lib/db'
import { z } from 'zod/v4'

const SubscribeSchema = z
  .object({
    email: z.email('Введите корректный email'),
  })
  .strip()

/** Подписаться на email-рассылку */
export async function subscribeToNewsletter(input: unknown): Promise<{ success: boolean; error?: string }> {
  const parsed = SubscribeSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Неверный email' }
  }

  const { email } = parsed.data
  const db = getPrisma()

  // Проверяем существующую подписку
  const existing = await db.newsletterSubscriber.findUnique({
    where: { email },
  })

  if (existing) {
    if (existing.isActive) {
      return { success: false, error: 'Вы уже подписаны на рассылку' }
    }
    // Реактивируем отписанного
    await db.newsletterSubscriber.update({
      where: { id: existing.id },
      data: { isActive: true, unsubscribedAt: null },
    })
    return { success: true }
  }

  // Привязываем к пользователю, если авторизован
  const session = await getSession()
  const userId = session?.user?.id || null

  await db.newsletterSubscriber.create({
    data: {
      email,
      userId,
    },
  })

  return { success: true }
}

/** Отписаться от рассылки по токену */
export async function unsubscribeFromNewsletter(token: string): Promise<{ success: boolean; error?: string }> {
  const db = getPrisma()

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { unsubToken: token },
  })

  if (!subscriber) {
    return { success: false, error: 'Подписка не найдена' }
  }

  if (!subscriber.isActive) {
    return { success: true }
  }

  await db.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      isActive: false,
      unsubscribedAt: new Date(),
    },
  })

  return { success: true }
}
