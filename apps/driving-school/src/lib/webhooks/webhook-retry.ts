'use server'

/**
 * Webhook Retry Service
 *
 * Обработка повторных попыток доставки webhook.
 * Вызывается по cron (например, каждую минуту).
 */

import { prisma } from '@/lib/db'
import type { WebhookLogStatus, WebhookStatus } from '@letar/driving-school-db/prisma'

import { calculateNextRetry, getMaxRetryAttempts } from './webhook-dispatcher'
import { createWebhookHeaders, createWebhookSignature } from './webhook-service'

// ============================================================================
// ТИПЫ
// ============================================================================

/** Тип лога для повторной отправки */
type WebhookLogForRetry = {
  id: string
  webhookId: string
  eventType: string
  eventId: string
  requestBody: string
  attempt: number
  webhook: {
    id: string
    url: string
    secret: string
    status: string
  }
}

/** Результат обработки retry */
export interface RetryProcessResult {
  processed: number
  succeeded: number
  failed: number
  exhausted: number
}

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

/** Таймаут запроса в мс */
const REQUEST_TIMEOUT_MS = 30000

/** Максимальный размер response body для логирования (10KB) */
const MAX_RESPONSE_BODY_SIZE = 10240

/** Максимум логов для обработки за один запуск (для избежания перегрузки) */
const BATCH_SIZE = 50

// ============================================================================
// RETRY PROCESSOR
// ============================================================================

/**
 * Обрабатывает все webhook логи, ожидающие retry
 *
 * Должен вызываться по cron (рекомендуется каждую минуту).
 *
 * @returns Статистика обработки
 *
 * @example
 * // В app/api/webhooks/process-retries/route.ts:
 * export async function POST(request: Request) {
 *   // Проверка cron secret
 *   const authHeader = request.headers.get('Authorization')
 *   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 *
 *   const result = await processWebhookRetries()
 *   return Response.json(result)
 * }
 */
export async function processWebhookRetries(): Promise<RetryProcessResult> {
  const result: RetryProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    exhausted: 0,
  }

  try {
    // Получаем максимальное количество попыток
    const maxAttempts = await getMaxRetryAttempts()

    // Находим логи, которые нужно повторить
    const logsToRetry = await prisma.webhookLog.findMany({
      where: {
        status: 'FAILED' as WebhookLogStatus,
        nextRetryAt: {
          lte: new Date(),
        },
        attempt: {
          lt: maxAttempts,
        },
        // Только для активных webhooks
        webhook: {
          status: 'ACTIVE' as WebhookStatus,
        },
      },
      include: {
        webhook: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        nextRetryAt: 'asc',
      },
    })

    // Обрабатываем параллельно
    const results = await Promise.allSettled(logsToRetry.map((log: WebhookLogForRetry) => retryWebhookDelivery(log)))

    for (const res of results) {
      result.processed++
      if (res.status === 'fulfilled') {
        if (res.value.success) {
          result.succeeded++
        } else if (res.value.exhausted) {
          result.exhausted++
        } else {
          result.failed++
        }
      } else {
        result.failed++
      }
    }
  } catch (error) {
    console.error('[Webhook Retry] Error processing retries:', error)
  }

  return result
}

/**
 * Повторяет доставку одного webhook
 */
async function retryWebhookDelivery(log: WebhookLogForRetry): Promise<{ success: boolean; exhausted: boolean }> {
  const startTime = Date.now()
  const newAttempt = log.attempt + 1
  const maxAttempts = await getMaxRetryAttempts()

  // Проверяем, что webhook всё ещё активен
  if (log.webhook.status !== 'ACTIVE') {
    // Помечаем как exhausted если webhook отключён
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: {
        status: 'EXHAUSTED' as WebhookLogStatus,
        errorMessage: 'Webhook disabled',
        nextRetryAt: null,
      },
    })
    return { success: false, exhausted: true }
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const signature = createWebhookSignature(log.requestBody, log.webhook.secret, timestamp)
  const headers = createWebhookHeaders(log.eventType, log.id, signature, timestamp)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const response = await fetch(log.webhook.url, {
      method: 'POST',
      headers,
      body: log.requestBody,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseTimeMs = Date.now() - startTime
    let responseBody = ''

    try {
      responseBody = await response.text()
      if (responseBody.length > MAX_RESPONSE_BODY_SIZE) {
        responseBody = responseBody.slice(0, MAX_RESPONSE_BODY_SIZE) + '... (truncated)'
      }
    } catch {
      responseBody = '(unable to read response body)'
    }

    const success = response.ok

    if (success) {
      // Успех — обновляем лог и статистику
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          responseStatus: response.status,
          responseBody,
          responseTimeMs,
          status: 'DELIVERED' as WebhookLogStatus,
          errorMessage: null,
          nextRetryAt: null,
          attempt: newAttempt,
        },
      })

      // Обновляем статистику webhook
      await prisma.webhook.update({
        where: { id: log.webhookId },
        data: {
          successCount: { increment: 1 },
          consecutiveFailures: 0,
          lastSuccessAt: new Date(),
        },
      })

      return { success: true, exhausted: false }
    } else {
      // Ошибка HTTP
      return await handleRetryFailure(log.id, log.webhookId, newAttempt, maxAttempts, {
        responseStatus: response.status,
        responseBody,
        responseTimeMs,
        errorMessage: `HTTP ${response.status}`,
      })
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return await handleRetryFailure(log.id, log.webhookId, newAttempt, maxAttempts, {
      responseTimeMs,
      errorMessage,
    })
  }
}

/**
 * Обрабатывает неудачную попытку retry
 */
async function handleRetryFailure(
  logId: string,
  webhookId: string,
  attempt: number,
  maxAttempts: number,
  details: {
    responseStatus?: number
    responseBody?: string
    responseTimeMs?: number
    errorMessage: string
  }
): Promise<{ success: boolean; exhausted: boolean }> {
  const exhausted = attempt >= maxAttempts
  const nextRetryAt = exhausted ? null : await calculateNextRetry(attempt)

  await prisma.webhookLog.update({
    where: { id: logId },
    data: {
      responseStatus: details.responseStatus,
      responseBody: details.responseBody,
      responseTimeMs: details.responseTimeMs,
      status: exhausted ? ('EXHAUSTED' as WebhookLogStatus) : ('FAILED' as WebhookLogStatus),
      errorMessage: details.errorMessage,
      nextRetryAt,
      attempt,
    },
  })

  // Обновляем статистику webhook
  await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      failureCount: { increment: 1 },
      consecutiveFailures: { increment: 1 },
      lastFailureAt: new Date(),
    },
  })

  return { success: false, exhausted }
}
