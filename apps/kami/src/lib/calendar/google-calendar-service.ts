/**
 * Сервис интеграции с Google Calendar
 *
 * Для работы требуется:
 * 1. Создать проект в Google Cloud Console
 * 2. Включить Google Calendar API
 * 3. Создать Service Account и скачать JSON ключ
 * 4. Делегировать доступ к календарю Service Account
 *
 * Переменные окружения:
 * - GOOGLE_CALENDAR_ID: ID календаря
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: Email Service Account
 * - GOOGLE_PRIVATE_KEY: Приватный ключ (в одну строку, с \n)
 */

import { prisma } from '@/lib/prisma'
import type { calendar_v3 } from 'googleapis'
import { google } from 'googleapis'

// Проверка конфигурации
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

/**
 * Проверяет, настроена ли интеграция с Google Calendar
 */
export function isGoogleCalendarConfigured(): boolean {
  return !!(GOOGLE_CALENDAR_ID && GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY)
}

/**
 * Получает авторизованный клиент Google Calendar
 */
function getCalendarClient(): calendar_v3.Calendar | null {
  if (!isGoogleCalendarConfigured()) {
    console.warn('[GoogleCalendar] Not configured, skipping')
    return null
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })

  return google.calendar({ version: 'v3', auth })
}

export interface CalendarEventData {
  summary: string
  description?: string
  startTime: Date
  endTime: Date
  attendeeEmail?: string
  meetingUrl?: string
}

/**
 * Создаёт событие в Google Calendar
 */
export async function createCalendarEvent(
  data: CalendarEventData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const calendar = getCalendarClient()

  if (!calendar) {
    return { success: false, error: 'Google Calendar not configured' }
  }

  try {
    const event: calendar_v3.Schema$Event = {
      summary: data.summary,
      description: data.description,
      start: {
        dateTime: data.startTime.toISOString(),
        timeZone: 'Europe/Moscow',
      },
      end: {
        dateTime: data.endTime.toISOString(),
        timeZone: 'Europe/Moscow',
      },
      // Добавляем участника, если указан email
      ...(data.attendeeEmail && {
        attendees: [{ email: data.attendeeEmail }],
      }),
      // Добавляем ссылку на встречу в описание
      ...(data.meetingUrl && {
        description: `${data.description || ''}\n\nСсылка на встречу: ${data.meetingUrl}`.trim(),
      }),
      // Настройки уведомлений
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // За сутки
          { method: 'email', minutes: 60 }, // За час
          { method: 'popup', minutes: 30 }, // За 30 минут
        ],
      },
    }

    const response = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: event,
      sendUpdates: data.attendeeEmail ? 'all' : 'none',
    })

    return {
      success: true,
      eventId: response.data.id || undefined,
    }
  } catch (error) {
    console.error('[GoogleCalendar] Failed to create event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Удаляет событие из Google Calendar
 */
export async function deleteCalendarEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  const calendar = getCalendarClient()

  if (!calendar) {
    return { success: false, error: 'Google Calendar not configured' }
  }

  try {
    await calendar.events.delete({
      calendarId: GOOGLE_CALENDAR_ID as string,
      eventId,
      sendUpdates: 'all',
    })

    return { success: true }
  } catch (error) {
    console.error('[GoogleCalendar] Failed to delete event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Получает список событий из Google Calendar за указанный период
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; events?: calendar_v3.Schema$Event[]; error?: string }> {
  const calendar = getCalendarClient()

  if (!calendar) {
    return { success: false, error: 'Google Calendar not configured' }
  }

  try {
    const response = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID as string,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    return {
      success: true,
      events: response.data.items || [],
    }
  } catch (error) {
    console.error('[GoogleCalendar] Failed to get events:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Синхронизирует забронированные слоты с Google Calendar
 * Создаёт события для новых бронирований, удаляет отменённые
 */
export async function syncBookedSlotsWithCalendar(): Promise<{
  created: number
  deleted: number
  errors: string[]
}> {
  const result = { created: 0, deleted: 0, errors: [] as string[] }

  if (!isGoogleCalendarConfigured()) {
    result.errors.push('Google Calendar not configured')
    return result
  }

  // Получаем все забронированные слоты без calendarEventId
  const unsyncedSlots = await prisma.bookedSlot.findMany({
    where: {
      type: 'booked',
      calendarEventId: null,
    },
    include: {
      request: true,
    },
  })

  // Создаём события для несинхронизированных слотов
  // Используем Promise.allSettled для параллельного создания событий
  const eventPromises = unsyncedSlots.map(async (slot) => {
    const eventResult = await createCalendarEvent({
      summary: `Консультация: ${slot.request?.name || 'Клиент'}`,
      description: `Тип: ${slot.request?.serviceType || 'Консультация'}\nEmail: ${
        slot.request?.email || '-'
      }\nTelegram: ${slot.request?.telegram || '-'}`,
      startTime: slot.startAt,
      endTime: slot.endAt,
      attendeeEmail: slot.request?.email,
    })

    return { slot, eventResult }
  })

  const eventResults = await Promise.allSettled(eventPromises)

  // Собираем успешные обновления для batch-операции
  const successfulUpdates: { id: string; calendarEventId: string }[] = []

  for (const settledResult of eventResults) {
    if (settledResult.status === 'fulfilled') {
      const { slot, eventResult } = settledResult.value
      if (eventResult.success && eventResult.eventId) {
        successfulUpdates.push({ id: slot.id, calendarEventId: eventResult.eventId })
      } else {
        result.errors.push(`Failed to sync slot ${slot.id}: ${eventResult.error}`)
      }
    } else {
      result.errors.push(`Promise rejected: ${settledResult.reason}`)
    }
  }

  // Batch update через transaction (вместо N отдельных запросов)
  if (successfulUpdates.length > 0) {
    await prisma.$transaction(
      successfulUpdates.map(({ id, calendarEventId }) =>
        prisma.bookedSlot.update({
          where: { id },
          data: { calendarEventId },
        })
      )
    )
    result.created = successfulUpdates.length
  }

  return result
}
