import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { CalendarEvent } from '@/lib/utils/calendar'
import { createICSResponse, generateICS } from '@/lib/utils/calendar'
import { NextResponse } from 'next/server'

/**
 * API Route для экспорта сессии в календарь (.ics файл)
 *
 * GET /api/calendar/session/[sessionId]
 *
 * Генерирует .ics файл для сессии, который можно добавить в любой календарь
 * (Google Calendar, Apple Calendar, Outlook, и т.д.)
 */
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const session = await getSession()
    const { sessionId } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ZenStack v3: enhanced client с автоматической проверкой прав
    const db = getEnhancedPrisma(session.user)

    // Получаем сессию с данными клиента и специалиста
    // ZenStack автоматически вернёт null если нет доступа
    const therapySession = await db.therapySession.findUnique({
      where: { id: sessionId },
      include: {
        client: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        specialist: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!therapySession) {
      // ZenStack вернёт null как при отсутствии записи, так и при отсутствии прав
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 })
    }

    // Вычисляем время окончания сессии
    const startDate = new Date(therapySession.scheduledAt)
    const endDate = new Date(startDate.getTime() + therapySession.duration * 60000)

    // Формируем описание для календаря
    let description = `Сессия ИМОТ: ${therapySession.topic || 'Консультация'}`

    if (therapySession.notes) {
      description += `\n\nЗаметки: ${therapySession.notes}`
    }

    if (therapySession.meetingUrl) {
      description += `\n\nСсылка на видео-звонок: ${therapySession.meetingUrl}`
    }

    // Создаем событие календаря
    const calendarEvent: CalendarEvent = {
      id: therapySession.id,
      title: `ИМОТ: ${therapySession.topic || 'Консультация'}`,
      description,
      location: therapySession.meetingUrl || 'Онлайн',
      url: therapySession.meetingUrl ?? undefined,
      startDate,
      endDate,
      organizerName: therapySession.specialist.name || 'Специалист ИМОТ',
      organizerEmail: therapySession.specialist.email ?? undefined,
      attendeeName: therapySession.client.user.name || 'Клиент',
      attendeeEmail: therapySession.client.user.email ?? undefined,
    }

    // Генерируем .ics контент
    const icsContent = generateICS(calendarEvent)

    // Формируем имя файла
    const filename = `imot-session-${therapySession.id.substring(0, 8)}.ics`

    // Возвращаем .ics файл
    return createICSResponse(icsContent, filename)
  } catch (error) {
    console.error('Failed to generate calendar file:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
