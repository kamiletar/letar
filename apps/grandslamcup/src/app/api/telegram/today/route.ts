/**
 * Cron endpoint: утренняя рассылка "Матч сегодня".
 * Вызывается внешним cron каждый день в 09:00 МСК.
 * GET /api/telegram/today?secret=CRON_SECRET
 */

import { sendTodayRemindersAll } from '@/lib/telegram'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await sendTodayRemindersAll()

  const sent = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success)

  return NextResponse.json({
    sent,
    errors: failed.map((r) => r.error),
  })
}
