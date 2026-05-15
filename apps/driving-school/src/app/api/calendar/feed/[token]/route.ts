/**
 * iCal Feed API Route
 *
 * GET /api/calendar/feed/[token]
 *
 * Возвращает iCalendar файл для подписки в внешних календарях.
 * Токен уникален для каждого пользователя и заменяет аутентификацию.
 *
 * Пример URL для подписки:
 * webcal://domain.com/api/calendar/feed/abc123
 *
 * Поддерживаемые query параметры:
 * - lessons=0|1 — включить занятия (default: 1)
 * - exams=0|1 — включить экзамены (default: 1)
 * - theory=0|1 — включить теоретические занятия (default: 1)
 * - absences=0|1 — включить отсутствия (default: 0)
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { generateUserCalendarFeed, getCalendarFeedByToken, updateFeedAccessStats } from '@/lib/calendar'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
    // Находим feed по токену
    const feed = await getCalendarFeedByToken(token)

    if (!feed) {
      return NextResponse.json({ error: 'Invalid calendar feed token' }, { status: 404 })
    }

    // Получаем параметры из query string
    const searchParams = request.nextUrl.searchParams
    const options = {
      includeLessons: feed.includeLessons && searchParams.get('lessons') !== '0',
      includeExams: feed.includeExams && searchParams.get('exams') !== '0',
      includeTheoryLessons: feed.includeTheoryLessons && searchParams.get('theory') !== '0',
      includeAbsences: feed.includeAbsences && searchParams.get('absences') !== '0',
    }

    // URL для обновления
    const feedUrl = `${request.nextUrl.origin}/api/calendar/feed/${token}`

    // Генерируем iCal
    const icalContent = await generateUserCalendarFeed(feed.userId, options, feedUrl)

    // Обновляем статистику доступа (не блокируем ответ)
    updateFeedAccessStats(feed.id).catch(() => {
      // Игнорируем ошибки обновления статистики
    })

    // Возвращаем iCal файл
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="calendar.ics"',
        // Кэширование на 5 минут для снижения нагрузки
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        // Для совместимости с календарными приложениями
        'X-WR-CALNAME': `Автошкола - ${feed.user.name || 'Календарь'}`,
      },
    })
  } catch (error) {
    console.error('[Calendar Feed] Error generating feed:', error)
    return NextResponse.json({ error: 'Failed to generate calendar feed' }, { status: 500 })
  }
}

// HEAD запрос для проверки доступности (используется некоторыми клиентами)
export async function HEAD(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const feed = await getCalendarFeedByToken(token)

  if (!feed) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
    },
  })
}
