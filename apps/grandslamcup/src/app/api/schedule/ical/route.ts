/**
 * iCal экспорт расписания матчей
 *
 * GET /api/schedule/ical — скачать .ics файл
 * Параметры: ?season= (ID сезона), ?team= (slug команды)
 */

import { prisma } from '@/lib/db'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const seasonId = searchParams.get('season')
  const teamSlug = searchParams.get('team')

  // Формируем фильтры
  const where: Record<string, unknown> = {
    status: { in: ['SCHEDULED', 'LIVE'] },
    scheduledAt: { not: null },
  }

  if (seasonId) {
    where.tour = { round: { seasonId } }
  }

  if (teamSlug) {
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      select: { id: true },
    })
    if (team) {
      where.OR = [{ homeTeam: { teamId: team.id } }, { awayTeam: { teamId: team.id } }]
    }
  }

  const matches = await prisma.match.findMany({
    where,
    include: {
      ...MATCH_TEAMS_NAME,
      venue: { select: { name: true, address: true } },
      tour: {
        include: {
          round: { include: { season: { select: { name: true } } } },
        },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  // Генерируем VCALENDAR
  const events = matches.map((match) => {
    const start = formatICalDate(match.scheduledAt!)
    // Матч длится ~2 часа
    const end = formatICalDate(new Date(match.scheduledAt!.getTime() + 2 * 60 * 60 * 1000))
    const summary = `${match.homeTeam.team.name} vs ${match.awayTeam.team.name}`
    const location = match.venue ? [match.venue.name, match.venue.address].filter(Boolean).join(', ') : ''
    const description = match.tour
      ? `${match.tour.round.season.name}, Круг ${match.tour.round.number}, Тур ${match.tour.number}`
      : 'Товарищеский матч'
    const uid = `match-${match.id}@grandslamcup.letar.best`

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeICalText(summary)}`,
      location ? `LOCATION:${escapeICalText(location)}` : '',
      `DESCRIPTION:${escapeICalText(description)}`,
      `URL:https://grandslamcup.letar.best/matches/${match.id}`,
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n')
  })

  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Grand Slam Cup//Poetry Tournament//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Grand Slam Cup — Расписание',
    'X-WR-TIMEZONE:Europe/Moscow',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(calendar, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="grandslamcup.ics"',
    },
  })
}

/** Формат даты для iCal: YYYYMMDDTHHmmssZ */
function formatICalDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/** Экранирование текста для iCal */
function escapeICalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
