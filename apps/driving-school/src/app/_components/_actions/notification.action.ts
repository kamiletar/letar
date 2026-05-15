'use server'

/**
 * Server Actions для системы уведомлений
 *
 * Временная реализация до добавления модели Notification в БД.
 * Сейчас генерирует уведомления на основе занятий пользователя.
 *
 * @module notification.action
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { Notification } from '../notification-bell'

// === Типы результатов ===

export type GetNotificationsResult =
  | { success: true; notifications: Notification[]; unreadCount: number }
  | { success: false; error: string }

export type MarkAsReadResult = { success: true } | { success: false; error: string }

// === Получение уведомлений ===

/**
 * Получает уведомления для пользователя.
 *
 * Временная реализация: генерирует уведомления из последних занятий.
 * В будущем будет использовать отдельную таблицу Notification.
 */
export async function getNotificationsAction(_userId?: string): Promise<GetNotificationsResult> {
  try {
    // Проверка авторизации — игнорируем переданный userId, используем сессию
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Не авторизован' }
    }
    const userId = session.user.id

    // Получаем последние занятия (как инструктора, так и ученика)
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Занятия как инструктора (ожидающие подтверждения)
    const pendingLessonsAsInstructor = await prisma.lesson.findMany({
      where: {
        instructorId: userId,
        status: 'PENDING',
        createdAt: { gte: weekAgo },
      },
      include: {
        student: { select: { name: true, email: true } },
        slot: { select: { startTime: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Занятия как ученика (подтверждённые, отменённые)
    const lessonsAsStudent = await prisma.lesson.findMany({
      where: {
        studentId: userId,
        status: { in: ['CONFIRMED', 'CANCELLED'] },
        createdAt: { gte: weekAgo },
      },
      include: {
        instructor: { select: { name: true, email: true } },
        slot: { select: { startTime: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Отзывы (если инструктор) — instructorId в Review ссылается на InstructorProfile.id
    const instructorProfile = await prisma.instructorProfile.findUnique({
      where: { userId },
      select: { id: true },
    })

    const recentReviews = instructorProfile
      ? await prisma.review.findMany({
          where: {
            instructorId: instructorProfile.id,
            createdAt: { gte: weekAgo },
          },
          include: {
            author: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        })
      : []

    // Формируем уведомления
    const notifications: Notification[] = []

    // Уведомления о новых заявках (для инструктора)
    for (const lesson of pendingLessonsAsInstructor) {
      const studentName = lesson.student.name || lesson.student.email
      notifications.push({
        id: `lesson-pending-${lesson.id}`,
        type: 'lesson_booked',
        title: 'Новая заявка на занятие',
        message: `${studentName} записался на занятие`,
        isRead: false, // В реальной системе это было бы из БД
        createdAt: lesson.createdAt,
        link: '/lessons?status=PENDING',
      })
    }

    // Уведомления о подтверждённых занятиях (для ученика)
    for (const lesson of lessonsAsStudent) {
      const instructorName = lesson.instructor.name || lesson.instructor.email
      if (lesson.status === 'CONFIRMED') {
        notifications.push({
          id: `lesson-confirmed-${lesson.id}`,
          type: 'lesson_confirmed',
          title: 'Занятие подтверждено',
          message: `${instructorName} подтвердил ваше занятие`,
          isRead: true, // Подтверждённые уже прочитаны
          createdAt: lesson.createdAt,
          link: '/my-lessons',
        })
      } else if (lesson.status === 'CANCELLED') {
        notifications.push({
          id: `lesson-cancelled-${lesson.id}`,
          type: 'lesson_cancelled',
          title: 'Занятие отменено',
          message: lesson.cancelReason || `Занятие с ${instructorName} было отменено`,
          isRead: true,
          createdAt: lesson.cancelledAt || lesson.createdAt,
          link: '/my-lessons',
        })
      }
    }

    // Уведомления о новых отзывах (для инструктора)
    for (const review of recentReviews) {
      const studentName = review.author.name || review.author.email
      notifications.push({
        id: `review-${review.id}`,
        type: 'review_received',
        title: 'Новый отзыв',
        message: `${studentName} оставил отзыв (${review.rating}★)`,
        isRead: false,
        createdAt: review.createdAt,
        link: '/reviews',
      })
    }

    // Сортируем по дате (новые первые)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Подсчитываем непрочитанные
    const unreadCount = notifications.filter((n) => !n.isRead).length

    return {
      success: true,
      notifications: notifications.slice(0, 20), // Максимум 20 уведомлений
      unreadCount,
    }
  } catch (error) {
    console.error('Ошибка получения уведомлений:', error)
    return { success: false, error: 'Не удалось загрузить уведомления' }
  }
}

// === Отметить как прочитанное ===

/**
 * Отмечает уведомление как прочитанное.
 *
 * Временная реализация: возвращает success без сохранения.
 * В реальной системе будет обновлять запись в БД.
 */
export async function markAsReadAction(_notificationId: string): Promise<MarkAsReadResult> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Не авторизован' }
  }
  // Временная реализация — всегда успех
  // В реальной системе здесь будет обновление записи в БД
  return { success: true }
}

// === Отметить все как прочитанные ===

/**
 * Отмечает все уведомления пользователя как прочитанные.
 */
export async function markAllAsReadAction(_userId?: string): Promise<MarkAsReadResult> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Не авторизован' }
  }
  // Временная реализация — всегда успех
  // В реальной системе здесь будет массовое обновление
  return { success: true }
}
