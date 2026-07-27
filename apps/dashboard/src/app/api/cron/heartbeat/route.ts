import { getAlertSettings } from '@/lib/alerts'
import { prisma } from '@/lib/db'
import { sendHeartbeatTelegram } from '@/lib/notifications'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * POST /api/cron/heartbeat
 *
 * Если за последние 24 часа не было ни одного алерта — шлёт в Telegram
 * «У всех всё хорошо», чтобы отличить «всё правда хорошо» от «канал уведомлений сломан».
 *
 * Вызывается dashboard-agent по расписанию (executeJob шлёт POST + X-Cron-Secret).
 * curl -X POST -H "X-Cron-Secret: $CRON_SECRET" https://dash.letar.best/api/cron/heartbeat
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const providedSecret = request.headers.get('x-cron-secret')
  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = new Date(Date.now() - WINDOW_MS)
  const alertsCount = await prisma.alert.count({ where: { createdAt: { gte: since } } })

  if (alertsCount > 0) {
    return NextResponse.json({ ok: true, sent: false, reason: 'alerts present', alertsCount })
  }

  const settings = await getAlertSettings()
  if (!settings.enabled || !settings.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
    return NextResponse.json({ ok: true, sent: false, reason: 'telegram not configured' })
  }

  const sent = await sendHeartbeatTelegram(settings.telegramBotToken, settings.telegramChatId)

  return NextResponse.json({ ok: true, sent })
}
