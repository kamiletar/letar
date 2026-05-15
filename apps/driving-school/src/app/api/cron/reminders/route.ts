/**
 * Cron endpoint для автоматических напоминаний (Фаза 18)
 *
 * Обрабатывает правила напоминаний каждой организации:
 * - DOCUMENT_EXPIRING — истекающие документы (медсправка!)
 * - PAYMENT_OVERDUE — просроченные платежи
 * - INACTIVE_STUDENT — нет занятий >N дней
 * - EXAM_UPCOMING — предстоящий экзамен
 * - LESSON_TOMORROW — занятие завтра
 * - DOCUMENTS_PENDING_LONG — документы на проверке >N дней
 *
 * curl -H "Authorization: Bearer $CRON_SECRET" https://domain/api/cron/reminders
 */

import { getAppUrl } from '@/lib/app-url'
import { notifyUser } from '@/lib/notifications'
import { createNotificationProviders, createOrchestratorRepository } from '@/lib/orchestrator-repository'
import { processAllReminders, type SendNotificationFn } from '@/lib/reminders'
import { NextResponse } from 'next/server'

/**
 * Создаёт функцию отправки уведомлений для reminder-service
 */
function createSendNotificationFn(): SendNotificationFn {
  const repo = createOrchestratorRepository()
  const providers = createNotificationProviders()
  const appUrl = getAppUrl()

  return async (params) => {
    const { userId, type, title, body, data, channels } = params

    // Переопределяем настройки каналов на основе правила
    const result = await notifyUser({
      userId,
      type,
      title,
      body,
      data,
      repo,
      providers: {
        ...providers,
        // Включаем/выключаем каналы на основе настроек правила
        push: channels.push ? providers.push : undefined,
        email: channels.email ? providers.email : undefined,
        telegram: channels.telegram ? providers.telegram : undefined,
      },
      appUrl,
    })

    // Формируем список использованных каналов
    const usedChannels: string[] = []
    if (result.channels.push.sent) {
      usedChannels.push('push')
    }
    if (result.channels.email.sent) {
      usedChannels.push('email')
    }
    if (result.channels.telegram.sent) {
      usedChannels.push('telegram')
    }

    return {
      success: result.success,
      channels: usedChannels,
    }
  }
}

// === API Route ===

export async function GET(request: Request) {
  // Проверка секретного токена
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    // Создаём функцию отправки уведомлений
    const sendNotification = createSendNotificationFn()

    // Обрабатываем все правила напоминаний
    const results = await processAllReminders(sendNotification)

    // Суммируем результаты
    const summary = results.reduce(
      (acc, r) => ({
        totalProcessed: acc.totalProcessed + r.processed,
        totalSent: acc.totalSent + r.sent,
        totalErrors: acc.totalErrors + r.errors,
      }),
      { totalProcessed: 0, totalSent: 0, totalErrors: 0 }
    )

    const duration = Date.now() - startTime

    // eslint-disable-next-line no-console
    console.info(
      `[Cron/Reminders] Обработано: ${summary.totalProcessed}, отправлено: ${summary.totalSent}, ошибок: ${summary.totalErrors}, время: ${duration}ms`
    )

    return NextResponse.json({
      success: true,
      summary,
      details: results.map((r) => ({
        type: r.type,
        processed: r.processed,
        sent: r.sent,
        errors: r.errors,
      })),
      duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron/Reminders] Ошибка обработки напоминаний:', error)
    return NextResponse.json(
      {
        error: 'Processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
