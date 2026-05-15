'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'

/**
 * Создать подписку на уведомления (все типы включены по умолчанию)
 */
export async function createSubscription(options: { locale: string; timezone: string }) {
  const session = await getSession()
  if (!session) {
    return { error: 'Не авторизован' }
  }

  // Синхронизируем пользователя из Better Auth в локальную таблицу User
  await prisma.user.upsert({
    where: { id: session.user.id },
    update: {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    create: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
  })

  const db = getEnhancedPrisma(session.user)

  // Проверяем, нет ли уже подписки
  const existing = await db.notificationSubscription.findUnique({
    where: { userId: session.user.id },
  })

  if (existing) {
    return { error: 'Подписка уже существует' }
  }

  const subscription = await db.notificationSubscription.create({
    data: {
      userId: session.user.id,
      locale: options.locale,
      timezone: options.timezone,
    },
  })

  return { data: subscription }
}

/**
 * Обновить настройки уведомлений
 */
export async function updateSubscription(settings: {
  notifyMonth: boolean
  notifyWeek: boolean
  notifyDay: boolean
  notifyHour: boolean
  notify5Min: boolean
  locale: string
  timezone: string
}) {
  const session = await getSession()
  if (!session) {
    return { error: 'Не авторизован' }
  }

  const db = getEnhancedPrisma(session.user)

  const subscription = await db.notificationSubscription.update({
    where: { userId: session.user.id },
    data: {
      notifyMonth: settings.notifyMonth,
      notifyWeek: settings.notifyWeek,
      notifyDay: settings.notifyDay,
      notifyHour: settings.notifyHour,
      notify5Min: settings.notify5Min,
      locale: settings.locale,
      timezone: settings.timezone,
      active: true,
    },
  })

  return { data: subscription }
}

/**
 * Отписаться от всех уведомлений
 */
export async function deleteSubscription() {
  const session = await getSession()
  if (!session) {
    return { error: 'Не авторизован' }
  }

  const db = getEnhancedPrisma(session.user)

  await db.notificationSubscription.update({
    where: { userId: session.user.id },
    data: { active: false },
  })

  return { data: true }
}

/**
 * Получить текущую подписку пользователя
 */
export async function getSubscription() {
  const session = await getSession()
  if (!session) {
    return { data: null }
  }

  const db = getEnhancedPrisma(session.user)

  const subscription = await db.notificationSubscription.findUnique({
    where: { userId: session.user.id },
  })

  return { data: subscription }
}

/**
 * Отписка по токену (без авторизации)
 */
export async function unsubscribeByToken(token: string) {
  // Используем raw prisma — без access control, т.к. пользователь не авторизован
  const subscription = await prisma.notificationSubscription.findUnique({
    where: { unsubscribeToken: token },
  })

  if (!subscription) {
    return { error: 'Неверный токен' }
  }

  await prisma.notificationSubscription.update({
    where: { id: subscription.id },
    data: { active: false },
  })

  return { data: true }
}
