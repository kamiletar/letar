import { getAlertSettings } from '@/lib/alerts'
import { prisma } from '@/lib/db'
import { sendHeartbeatTelegram, sendUndeliveredAlertsTelegram } from '@/lib/notifications'
import { verifyCronSecret } from '@letar/api-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * POST /api/cron/heartbeat
 *
 * Если за последние 24 часа не было ни одного алерта — шлёт в Telegram
 * «У всех всё хорошо», чтобы отличить «всё правда хорошо» от «канал уведомлений сломан».
 *
 * PLAN-INFRA-3.md §52 «сторож для сторожа»: раньше молчал при ЛЮБОМ алерте за сутки — включая
 * недоставленный. `Alert.notified` (null — уведомление не пыталось отправляться для этого типа,
 * true — ушло, false — попытка была и провалилась) различает это: heartbeat реагирует только на
 * явные провалы доставки (`notified: false`), не на «алертов не было» и не на «алерт был, но для
 * него уведомления не планировались» (например DEPS_VULNERABLE, см. lib/deps.ts).
 *
 * Вызывается dashboard-agent по расписанию (executeJob шлёт POST + X-Cron-Secret).
 * curl -X POST -H "X-Cron-Secret: $CRON_SECRET" https://dash.letar.best/api/cron/heartbeat
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = new Date(Date.now() - WINDOW_MS)
  const undeliveredCount = await prisma.alert.count({ where: { createdAt: { gte: since }, notified: false } })

  const settings = await getAlertSettings()
  if (!settings.enabled || !settings.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
    return NextResponse.json({ ok: true, sent: false, reason: 'telegram not configured', undeliveredCount })
  }

  if (undeliveredCount > 0) {
    // Канал доставки не мёртв прямо сейчас (иначе этот же fetch тоже не дойдёт) — но раз попытка
    // доставки алерта провалилась, стоит явно сообщить, а не молчать как при «всё хорошо».
    const sent = await sendUndeliveredAlertsTelegram(
      settings.telegramBotToken,
      settings.telegramChatId,
      undeliveredCount,
    )
    return NextResponse.json({ ok: true, sent, reason: 'undelivered alerts present', undeliveredCount })
  }

  const alertsCount = await prisma.alert.count({ where: { createdAt: { gte: since } } })
  if (alertsCount > 0) {
    return NextResponse.json({ ok: true, sent: false, reason: 'alerts present and delivered', alertsCount })
  }

  const sent = await sendHeartbeatTelegram(settings.telegramBotToken, settings.telegramChatId)

  return NextResponse.json({ ok: true, sent })
}
