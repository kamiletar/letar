/**
 * Если за 24ч не было ни одного `Alert` — отправляет в Telegram «У всех всё хорошо», чтобы
 * отличить «всё правда хорошо» от «канал уведомлений сломан» (PLAN-INFRA-3.md §52). Если за
 * это же окно были недоставленные алерты (`Alert.notified === false`) — шлёт отдельное
 * предупреждение вместо тишины, см. `lib/notifications.ts` `sendUndeliveredAlertsTelegram()`.
 *
 * Раньше это была ручка `/api/cron/heartbeat`, которую по расписанию дёргал `dashboard-agent`
 * (`DEFAULT_CRON_JOBS`) — перенесено на `@letar/jobs` (PLAN-INFRA-4.md §75), логика не менялась.
 */
import { getAlertSettings } from '@/lib/alerts'
import { prisma } from '@/lib/db'
import { sendHeartbeatTelegram, sendUndeliveredAlertsTelegram } from '@/lib/notifications'
import { defineJob } from '@letar/jobs'

const WINDOW_MS = 24 * 60 * 60 * 1000

export const heartbeatJob = defineJob({
  id: 'dashboard-heartbeat',
  name: 'Heartbeat',
  description: 'Если за 24ч не было ни одного Alert (или были, но не доставлены) — уведомление в Telegram',
  schedule: '0 21 * * *',
  handler: async () => {
    const since = new Date(Date.now() - WINDOW_MS)
    const undeliveredCount = await prisma.alert.count({ where: { createdAt: { gte: since }, notified: false } })

    const settings = await getAlertSettings()
    if (!settings.enabled || !settings.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
      return
    }

    if (undeliveredCount > 0) {
      await sendUndeliveredAlertsTelegram(settings.telegramBotToken, settings.telegramChatId, undeliveredCount)
      return
    }

    const alertsCount = await prisma.alert.count({ where: { createdAt: { gte: since } } })
    if (alertsCount > 0) {
      return
    }

    await sendHeartbeatTelegram(settings.telegramBotToken, settings.telegramChatId)
  },
})
