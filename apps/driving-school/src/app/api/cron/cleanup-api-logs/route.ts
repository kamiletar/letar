import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// Количество дней хранения логов (по умолчанию 30)
const LOG_RETENTION_DAYS = Number(process.env.API_LOG_RETENTION_DAYS) || 30

/**
 * Cron endpoint для очистки старых логов API
 * Вызывается периодически (ежедневно) через системный cron или Vercel Cron
 *
 * curl -H "Authorization: Bearer $CRON_SECRET" https://domain/api/cron/cleanup-api-logs
 */
export async function GET(request: Request) {
  // Проверка секретного токена
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Вычисляем дату отсечки
    const cutoffDate = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000)

    // Удаляем старые логи
    const result = await prisma.apiLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    // eslint-disable-next-line no-console
    console.info(`[Cron] Очищено ${result.count} старых записей API логов (старше ${LOG_RETENTION_DAYS} дней)`)

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      retentionDays: LOG_RETENTION_DAYS,
      cutoffDate: cutoffDate.toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Ошибка очистки API логов:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
