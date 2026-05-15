/**
 * Cron endpoint: еженедельная рассылка "Матчи на этой неделе".
 * Вызывается внешним cron по понедельникам в 10:00 МСК.
 * GET /api/telegram/weekly?secret=CRON_SECRET
 */

import { sendWeeklyScheduleAll } from '@/lib/telegram'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await sendWeeklyScheduleAll()

  const sent = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success)

  return NextResponse.json({
    sent,
    errors: failed.map((r) => r.error),
  })
}
