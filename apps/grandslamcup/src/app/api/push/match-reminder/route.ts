/**
 * Cron endpoint: push-напоминание о матчах на завтра.
 * Вызывается внешним cron каждый день в 17:00 МСК.
 * GET /api/push/match-reminder?secret=CRON_SECRET
 */

import { prisma } from '@/lib/db'
import { sendPushToAll } from '@/lib/push-notifications'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Матчи на завтра (UTC+3 — Москва)
  const now = new Date()
  const mskOffset = 3 * 60 * 60 * 1000
  const mskNow = new Date(now.getTime() + mskOffset)

  const tomorrowStart = new Date(mskNow)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  tomorrowStart.setHours(0, 0, 0, 0)
  const tomorrowStartUtc = new Date(tomorrowStart.getTime() - mskOffset)

  const tomorrowEnd = new Date(tomorrowStart)
  tomorrowEnd.setHours(23, 59, 59, 999)
  const tomorrowEndUtc = new Date(tomorrowEnd.getTime() - mskOffset)

  const matches = await prisma.match.findMany({
    where: {
      scheduledAt: { gte: tomorrowStartUtc, lte: tomorrowEndUtc },
      status: 'SCHEDULED',
    },
    include: {
      homeTeam: { include: { team: { select: { name: true } } } },
      awayTeam: { include: { team: { select: { name: true } } } },
      venue: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  if (matches.length === 0) {
    return NextResponse.json({ sent: 0, matches: 0, message: 'Нет матчей на завтра' })
  }

  // Формируем текст уведомления
  const matchLines = matches.map((m) => {
    const time = m.scheduledAt
      ? new Date(m.scheduledAt.getTime() + mskOffset).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
      : '??:??'
    return `${time} ${m.homeTeam.team.name} — ${m.awayTeam.team.name}`
  })

  const body = matches.length === 1
    ? `${matchLines[0]}${matches[0].venue ? ` (${matches[0].venue.name})` : ''}`
    : matchLines.join('\n')

  const result = await sendPushToAll({
    title: matches.length === 1 ? 'Матч завтра!' : `Матчи завтра: ${matches.length}`,
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url: '/schedule',
    tag: 'match-reminder',
  })

  return NextResponse.json({
    matches: matches.length,
    ...result,
  })
}
