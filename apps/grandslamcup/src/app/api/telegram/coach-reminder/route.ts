/**
 * Cron: напоминание тренерам о заявке составов.
 *
 * Ежедневно проверяет матчи через 24 часа без полных составов
 * и отправляет личные сообщения тренерам через Telegram.
 *
 * GET /api/telegram/coach-reminder?secret=CRON_SECRET
 */

import { prisma } from '@/lib/db'
import { sendCoachLineupReminder } from '@/lib/telegram/senders-personal'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Матчи через 20-28 часов (окно напоминания "за 24 часа")
    const now = new Date()
    const from = new Date(now.getTime() + 20 * 60 * 60 * 1000)
    const to = new Date(now.getTime() + 28 * 60 * 60 * 1000)

    const upcomingMatches = await prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: from, lte: to },
      },
      select: { id: true },
    })

    let sent = 0
    let errors = 0

    for (const match of upcomingMatches) {
      const results = await sendCoachLineupReminder(match.id)
      for (const r of results) {
        if (r.success) sent++
        else errors++
      }
    }

    return NextResponse.json({
      matches: upcomingMatches.length,
      sent,
      errors,
    })
  } catch (err) {
    console.error('[coach-reminder cron] ошибка:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
