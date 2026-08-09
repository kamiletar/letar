import { AlertSeverity, AlertType, createAlert, getActiveAlerts, getAlerts, getAlertSettings } from '@/lib/alerts'
import { sendNotification } from '@/lib/notifications'
import { verifyCronSecret } from '@letar/api-server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

/**
 * GET /api/alerts
 * Возвращает список всех алертов
 *
 * Query параметры:
 * - active: boolean - только активные алерты
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const alerts = activeOnly ? await getActiveAlerts() : await getAlerts()

    return NextResponse.json({
      success: true,
      count: alerts.length,
      alerts,
    })
  } catch (error) {
    console.error('Error in /api/alerts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

const CreateAlertSchema = z
  .object({
    type: z.enum(Object.values(AlertType) as [AlertType, ...AlertType[]]),
    severity: z.enum(Object.values(AlertSeverity) as [AlertSeverity, ...AlertSeverity[]]),
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(2000),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strip()

/**
 * POST /api/alerts
 * Создаёт алерт (используется dashboard-agent при провале cron-задач на других серверах,
 * т.к. сам dashboard-agent не имеет доступа к БД dashboard) и, если включён Telegram
 * в AlertSettings, сразу уведомляет.
 *
 * Авторизация: тот же X-Cron-Secret, что dashboard-agent использует для вызова cron-эндпоинтов.
 */
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = CreateAlertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const alert = await createAlert(
      parsed.data.type,
      parsed.data.severity,
      parsed.data.title,
      parsed.data.message,
      parsed.data.metadata,
    )

    const settings = await getAlertSettings()
    if (settings.enabled) {
      const sent = await sendNotification(
        alert,
        settings.telegramEnabled,
        settings.telegramBotToken,
        settings.telegramChatId,
      )
      if (!sent) {
        // sendNotification() уже залогировал причину (канал не настроен либо реальная ошибка
        // отправки) — здесь фиксируем сам факт «алерт создан, но уведомление не ушло», чтобы
        // это было видно в логах именно этого запроса, а не только внутри notifications.ts.
        console.warn(`[POST /api/alerts] Уведомление НЕ отправлено для alert ${alert.id} (type=${alert.type})`)
      }
    } else {
      console.warn(
        `[POST /api/alerts] AlertSettings.enabled=false — alert ${alert.id} (type=${alert.type}) создан, уведомление не отправлялось`,
      )
    }

    return NextResponse.json({ success: true, alert })
  } catch (error) {
    console.error('Error creating alert in /api/alerts:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
