'use server'

/**
 * Calendar Settings Actions
 *
 * Server Actions для управления настройками календарей пользователя:
 * - iCal Feed (readonly подписка)
 * - Google Calendar (двусторонняя синхронизация)
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

import { getSession } from '@/lib/auth'
import {
  deleteCalendarFeed,
  getOrCreateCalendarFeed,
  googleCalendarService,
  regenerateFeedToken,
  syncLessonToGoogle,
} from '@/lib/calendar'
import { prisma } from '@/lib/db'
import type { CalendarSyncDirection } from '@letar/driving-school-db/prisma'

// ============================================================================
// SCHEMAS
// ============================================================================

const UpdateFeedSettingsSchema = z.object({
  includeLessons: z.boolean(),
  includeExams: z.boolean(),
  includeTheoryLessons: z.boolean(),
  includeAbsences: z.boolean(),
})

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Получить или создать iCal feed URL для текущего пользователя
 */
export async function getCalendarFeedAction() {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const feed = await getOrCreateCalendarFeed(session.user.id)
    return { success: true, data: feed }
  } catch (error) {
    console.error('[Calendar] Error getting feed:', error)
    return { error: 'Failed to get calendar feed' }
  }
}

/**
 * Обновить настройки iCal feed
 */
export async function updateFeedSettingsAction(input: z.infer<typeof UpdateFeedSettingsSchema>) {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  const parsed = UpdateFeedSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  try {
    // Получаем или создаём feed
    const existingFeed = await prisma.calendarFeed.findUnique({
      where: { userId: session.user.id },
    })

    const feed = existingFeed
      ? await prisma.calendarFeed.update({
          where: { userId: session.user.id },
          data: parsed.data,
        })
      : await prisma.calendarFeed.create({
          data: {
            userId: session.user.id,
            ...parsed.data,
          },
        })

    revalidatePath('/settings/calendar')
    return { success: true, data: feed }
  } catch (error) {
    console.error('[Calendar] Error updating feed settings:', error)
    return { error: 'Failed to update settings' }
  }
}

/**
 * Перегенерировать токен feed (для безопасности)
 */
export async function regenerateFeedTokenAction() {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const feed = await regenerateFeedToken(session.user.id)
    revalidatePath('/settings/calendar')
    return { success: true, data: feed }
  } catch (error) {
    console.error('[Calendar] Error regenerating token:', error)
    return { error: 'Failed to regenerate token' }
  }
}

/**
 * Удалить iCal feed
 */
export async function deleteFeedAction() {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    await deleteCalendarFeed(session.user.id)
    revalidatePath('/settings/calendar')
    return { success: true }
  } catch (error) {
    console.error('[Calendar] Error deleting feed:', error)
    return { error: 'Failed to delete feed' }
  }
}

/**
 * Получить список подключённых календарей
 */
export async function getCalendarConnectionsAction() {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const connections = await prisma.calendarConnection.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        syncDirection: true,
        syncStatus: true,
        lastSyncAt: true,
        lastSyncError: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: connections }
  } catch (error) {
    console.error('[Calendar] Error getting connections:', error)
    return { error: 'Failed to get calendar connections' }
  }
}

/**
 * Удалить подключение к внешнему календарю
 */
export async function deleteCalendarConnectionAction(connectionId: string) {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    // Проверяем, что подключение принадлежит пользователю
    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        userId: session.user.id,
      },
    })

    if (!connection) {
      return { error: 'Connection not found' }
    }

    await prisma.calendarConnection.delete({
      where: { id: connectionId },
    })

    revalidatePath('/settings/calendar')
    return { success: true }
  } catch (error) {
    console.error('[Calendar] Error deleting connection:', error)
    return { error: 'Failed to delete connection' }
  }
}

// ============================================================================
// GOOGLE CALENDAR ACTIONS
// ============================================================================

const ConnectGoogleCalendarSchema = z
  .object({
    calendarId: z.string().min(1),
    calendarName: z.string().min(1),
    syncDirection: z.enum(['EXPORT_ONLY', 'IMPORT_ONLY', 'BIDIRECTIONAL']),
  })
  .strip()

/**
 * Получить список календарей Google текущего пользователя
 *
 * Требует, чтобы пользователь уже был авторизован через Google OAuth
 */
export async function listGoogleCalendarsAction() {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    // Получаем OAuth account пользователя для Google
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: 'google',
      },
      select: {
        accessToken: true,
        refreshToken: true,
        accessTokenExpiresAt: true,
      },
    })

    if (!account?.accessToken) {
      return {
        error: 'Google аккаунт не подключён',
        needsAuth: true,
      }
    }

    // Получаем список календарей
    const calendars = await googleCalendarService.listCalendars(account.accessToken)

    // Фильтруем только календари с правами записи
    const writableCalendars = calendars.filter((cal) => cal.accessRole === 'owner' || cal.accessRole === 'writer')

    return {
      success: true,
      data: writableCalendars.map((cal) => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description,
        isPrimary: cal.primary ?? false,
        backgroundColor: cal.backgroundColor,
      })),
    }
  } catch (error) {
    console.error('[Calendar] Error listing Google calendars:', error)

    // Если ошибка связана с токеном — нужна повторная авторизация
    if (error instanceof Error && error.message.includes('token')) {
      return {
        error: 'Необходимо повторно подключить Google аккаунт',
        needsAuth: true,
      }
    }

    return { error: 'Не удалось получить список календарей' }
  }
}

/**
 * Подключить Google Calendar для синхронизации
 */
export async function connectGoogleCalendarAction(input: z.infer<typeof ConnectGoogleCalendarSchema>) {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  const parsed = ConnectGoogleCalendarSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  try {
    // Получаем OAuth account
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: 'google',
      },
      select: {
        accessToken: true,
        refreshToken: true,
        accessTokenExpiresAt: true,
      },
    })

    if (!account?.accessToken) {
      return { error: 'Google аккаунт не подключён', needsAuth: true }
    }

    // Проверяем, не подключён ли уже этот календарь
    const existing = await prisma.calendarConnection.findFirst({
      where: {
        userId: session.user.id,
        provider: 'GOOGLE',
        calendarId: parsed.data.calendarId,
      },
    })

    if (existing) {
      return { error: 'Этот календарь уже подключён' }
    }

    // Создаём подключение
    const connection = await prisma.calendarConnection.create({
      data: {
        userId: session.user.id,
        provider: 'GOOGLE',
        calendarId: parsed.data.calendarId,
        calendarName: parsed.data.calendarName,
        syncDirection: parsed.data.syncDirection as CalendarSyncDirection,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        tokenExpiresAt: account.accessTokenExpiresAt,
        syncStatus: 'PENDING',
      },
    })

    revalidatePath('/settings/calendar')
    return { success: true, data: connection }
  } catch (error) {
    console.error('[Calendar] Error connecting Google calendar:', error)
    return { error: 'Не удалось подключить календарь' }
  }
}

/**
 * Обновить настройки синхронизации календаря
 */
export async function updateCalendarSyncSettingsAction(connectionId: string, syncDirection: CalendarSyncDirection) {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        userId: session.user.id,
      },
    })

    if (!connection) {
      return { error: 'Подключение не найдено' }
    }

    await prisma.calendarConnection.update({
      where: { id: connectionId },
      data: { syncDirection },
    })

    revalidatePath('/settings/calendar')
    return { success: true }
  } catch (error) {
    console.error('[Calendar] Error updating sync settings:', error)
    return { error: 'Не удалось обновить настройки' }
  }
}

/**
 * Запустить ручную синхронизацию календаря.
 *
 * Ставит статус SYNCING и запускает фоновую синхронизацию (fire-and-forget):
 * - Загружает будущие занятия пользователя
 * - Для каждого вызывает syncLessonToGoogle
 * - По завершении обновляет статус на SUCCESS или ERROR
 */
export async function triggerCalendarSyncAction(connectionId: string) {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }

  try {
    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        userId: session.user.id,
      },
    })

    if (!connection) {
      return { error: 'Подключение не найдено' }
    }

    // Обновляем статус на SYNCING
    await prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        syncStatus: 'SYNCING',
        lastSyncError: null,
      },
    })

    // Fire-and-forget: фоновая синхронизация не блокирует ответ
    void performCalendarSync(connection.id, session.user.id)

    revalidatePath('/settings/calendar')
    return { success: true }
  } catch (error) {
    console.error('[Calendar] Error triggering sync:', error)
    return { error: 'Ошибка синхронизации' }
  }
}

/**
 * Фоновая синхронизация: экспортирует будущие занятия в Google Calendar.
 * Вызывается fire-and-forget из triggerCalendarSyncAction.
 */
async function performCalendarSync(connectionId: string, userId: string): Promise<void> {
  try {
    const connection = await prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      return
    }

    // Загружаем будущие подтверждённые занятия пользователя
    const now = new Date()
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [{ instructorId: userId }, { studentId: userId }],
        status: { in: ['CONFIRMED', 'PENDING'] },
        slot: { startTime: { gte: now } },
      },
      include: {
        slot: true,
        lessonType: true,
        student: { select: { name: true } },
        instructor: { select: { name: true } },
      },
      take: 100, // Ограничиваем для безопасности
    })

    const isInstructor = lessons.some((l) => l.instructorId === userId)
    const tokenInfo = {
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.tokenExpiresAt,
    }

    let syncErrors = 0
    for (const lesson of lessons) {
      // Преобразуем lessonType: null → undefined для совместимости с типом lessonToEvent
      const lessonForSync = {
        ...lesson,
        lessonType: lesson.lessonType ?? undefined,
      }
      const result = await syncLessonToGoogle(
        lessonForSync,
        tokenInfo,
        connection.calendarId,
        null, // Без привязки к существующему событию (создаём новые)
        isInstructor,
        'create'
      )
      if (result.error) {
        syncErrors++
      }
    }

    // Обновляем статус
    await prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        syncStatus: syncErrors > 0 ? 'ERROR' : 'SUCCESS',
        lastSyncAt: new Date(),
        lastSyncError: syncErrors > 0 ? `${syncErrors} из ${lessons.length} занятий не синхронизировано` : null,
      },
    })
  } catch (error) {
    console.error('[Calendar] Background sync failed:', error)

    await prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        syncStatus: 'ERROR',
        lastSyncError: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}
