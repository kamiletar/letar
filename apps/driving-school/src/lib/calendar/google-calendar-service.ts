/**
 * Google Calendar Service
 *
 * Сервис для двусторонней синхронизации с Google Calendar API v3.
 *
 * Возможности:
 * - Создание/обновление/удаление событий
 * - Автоматический refresh access token
 * - Маппинг занятий → Google Calendar events
 *
 * @module google-calendar-service
 */

import type { Lesson } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface GoogleCalendarEvent {
  id?: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  colorId?: string
  reminders?: {
    useDefault: boolean
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>
  }
  extendedProperties?: {
    private: Record<string, string>
  }
}

export interface GoogleCalendarList {
  kind: 'calendar#calendarList'
  etag: string
  nextPageToken?: string
  nextSyncToken?: string
  items: GoogleCalendarListEntry[]
}

export interface GoogleCalendarListEntry {
  kind: 'calendar#calendarListEntry'
  etag: string
  id: string
  summary: string
  description?: string
  location?: string
  timeZone?: string
  colorId?: string
  backgroundColor?: string
  foregroundColor?: string
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner'
  primary?: boolean
}

export interface TokenInfo {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}

// === Константы ===

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const TIMEZONE = 'Europe/Moscow'

// Цвета событий Google Calendar
// https://developers.google.com/calendar/api/v3/reference/colors
const EVENT_COLORS = {
  LESSON: '9', // Синий — практические занятия
  EXAM: '11', // Красный — экзамены
  THEORY: '2', // Зелёный — теория
  ABSENCE: '8', // Серый — отсутствие
} as const

// === Google Calendar Service ===

class GoogleCalendarService {
  private clientId: string
  private clientSecret: string

  constructor() {
    const clientId = process.env.AUTH_GOOGLE_ID
    const clientSecret = process.env.AUTH_GOOGLE_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured')
    }

    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  // === Token Management ===

  /**
   * Обновить access token используя refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    expiresIn: number
    refreshToken?: string
  }> {
    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Google Calendar] Token refresh failed:', error)
      throw new Error('Failed to refresh Google access token')
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token, // Может быть новый refresh token
    }
  }

  /**
   * Получить актуальный access token, обновив при необходимости
   */
  async getValidToken(tokenInfo: TokenInfo): Promise<string> {
    const { accessToken, refreshToken, expiresAt } = tokenInfo

    // Проверяем, истёк ли токен (с запасом 5 минут)
    if (expiresAt && new Date() < new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
      return accessToken
    }

    // Токен истёк, нужен refresh
    if (!refreshToken) {
      throw new Error('Access token expired and no refresh token available')
    }

    const refreshed = await this.refreshAccessToken(refreshToken)
    return refreshed.accessToken
  }

  // === Calendar List ===

  /**
   * Получить список календарей пользователя
   */
  async listCalendars(accessToken: string): Promise<GoogleCalendarListEntry[]> {
    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Google Calendar] List calendars failed:', error)
      throw new Error('Failed to list Google calendars')
    }

    const data: GoogleCalendarList = await response.json()
    return data.items || []
  }

  // === Event Management ===

  /**
   * Создать событие в календаре
   */
  async createEvent(accessToken: string, calendarId: string, event: GoogleCalendarEvent): Promise<GoogleCalendarEvent> {
    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Google Calendar] Create event failed:', error)
      throw new Error('Failed to create Google Calendar event')
    }

    return response.json()
  }

  /**
   * Обновить событие в календаре
   */
  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('[Google Calendar] Update event failed:', error)
      throw new Error('Failed to update Google Calendar event')
    }

    return response.json()
  }

  /**
   * Удалить событие из календаря
   */
  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    // 410 Gone — событие уже удалено, это ОК
    if (!response.ok && response.status !== 410) {
      const error = await response.text()
      console.error('[Google Calendar] Delete event failed:', error)
      throw new Error('Failed to delete Google Calendar event')
    }
  }

  /**
   * Получить событие по ID
   */
  async getEvent(accessToken: string, calendarId: string, eventId: string): Promise<GoogleCalendarEvent | null> {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      const error = await response.text()
      console.error('[Google Calendar] Get event failed:', error)
      throw new Error('Failed to get Google Calendar event')
    }

    return response.json()
  }

  // === Lesson Mapping ===

  /**
   * Преобразовать занятие в Google Calendar event
   */
  lessonToEvent(
    lesson: Lesson & {
      slot: { startTime: Date; endTime: Date }
      instructor?: { name: string | null }
      student?: { name: string | null }
      lessonType?: { name: string }
    },
    isInstructor: boolean
  ): GoogleCalendarEvent {
    const startTime = new Date(lesson.slot.startTime)
    const endTime = new Date(lesson.slot.endTime)

    // Формируем название
    let summary = 'Занятие по вождению'
    if (isInstructor && lesson.student?.name) {
      summary = `Вождение: ${lesson.student.name}`
    } else if (!isInstructor && lesson.instructor?.name) {
      summary = `Вождение с ${lesson.instructor.name}`
    }

    // Формируем описание
    const descriptionParts: string[] = []

    if (lesson.lessonType?.name) {
      descriptionParts.push(`Тип: ${lesson.lessonType.name}`)
    }

    if (lesson.instructorNotes) {
      descriptionParts.push(`Заметки: ${lesson.instructorNotes}`)
    }

    descriptionParts.push('\n---')
    descriptionParts.push('Синхронизировано из Автошколы')

    return {
      summary,
      description: descriptionParts.join('\n'),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: TIMEZONE,
      },
      colorId: EVENT_COLORS.LESSON,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 }, // За 1 час
          { method: 'popup', minutes: 15 }, // За 15 минут
        ],
      },
      extendedProperties: {
        private: {
          drivingSchoolLessonId: lesson.id,
          syncedAt: new Date().toISOString(),
        },
      },
    }
  }
}

// === Экспорт ===

export const googleCalendarService = new GoogleCalendarService()

/**
 * Синхронизировать занятие с Google Calendar
 *
 * @param lesson - Занятие для синхронизации
 * @param connection - Подключение к календарю
 * @param action - Действие: create, update, delete
 */
export async function syncLessonToGoogle(
  lesson: Parameters<GoogleCalendarService['lessonToEvent']>[0],
  tokenInfo: TokenInfo,
  calendarId: string,
  existingEventId: string | null,
  isInstructor: boolean,
  action: 'create' | 'update' | 'delete'
): Promise<{ eventId: string | null; error?: string }> {
  try {
    const accessToken = await googleCalendarService.getValidToken(tokenInfo)

    if (action === 'delete') {
      if (existingEventId) {
        await googleCalendarService.deleteEvent(accessToken, calendarId, existingEventId)
      }
      return { eventId: null }
    }

    const event = googleCalendarService.lessonToEvent(lesson, isInstructor)

    if (action === 'create' || !existingEventId) {
      const created = await googleCalendarService.createEvent(accessToken, calendarId, event)
      return { eventId: created.id || null }
    }

    // Update
    const updated = await googleCalendarService.updateEvent(accessToken, calendarId, existingEventId, event)
    return { eventId: updated.id || null }
  } catch (error) {
    console.error('[Google Calendar] Sync failed:', error)
    return {
      eventId: existingEventId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
