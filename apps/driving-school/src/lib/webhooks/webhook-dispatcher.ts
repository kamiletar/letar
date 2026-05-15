'use server'

/**
 * Webhook Dispatcher
 *
 * Отправка webhook запросов с логированием и обработкой ошибок.
 * Fire-and-forget паттерн — не блокирует основной запрос.
 */

import { prisma } from '@/lib/db'
import type { WebhookEventType, WebhookLogStatus, WebhookStatus } from '@letar/driving-school-db/prisma'

import { createWebhookHeaders, createWebhookSignature } from './webhook-service'

// ============================================================================
// ТИПЫ
// ============================================================================

/** Payload события webhook */
export interface WebhookEventPayload {
  /** Тип события */
  event: WebhookEventType
  /** ID связанной сущности (lesson, payment и т.д.) */
  entityId: string
  /** Данные события */
  data: Record<string, unknown>
  /** Timestamp события */
  occurredAt: string
}

/** Результат отправки webhook */
export interface WebhookDeliveryResult {
  success: boolean
  logId: string
  statusCode?: number
  responseTimeMs?: number
  error?: string
}

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

/** Таймаут запроса в мс */
const REQUEST_TIMEOUT_MS = 30000

/** Максимальный размер response body для логирования (10KB) */
const MAX_RESPONSE_BODY_SIZE = 10240

/** После скольких последовательных ошибок отключить webhook */
const AUTO_DISABLE_THRESHOLD = 10

// ============================================================================
// DISPATCHER
// ============================================================================

/**
 * Диспатчит webhook событие всем активным webhooks организации
 *
 * Fire-and-forget: возвращает управление сразу, не ждёт ответа.
 * Использует Promise.allSettled для параллельной отправки.
 *
 * @param organizationId - ID организации
 * @param event - Тип события
 * @param entityId - ID сущности (lesson, payment и т.д.)
 * @param data - Данные события
 *
 * @example
 * // В lesson.action.ts после подтверждения занятия:
 * void dispatchWebhookEvent(lesson.organizationId, 'LESSON_CONFIRMED', lesson.id, {
 *   lessonId: lesson.id,
 *   studentId: lesson.studentId,
 *   instructorId: lesson.instructorId,
 *   startTime: lesson.slot.startTime.toISOString(),
 * })
 */
export async function dispatchWebhookEvent(
  organizationId: string,
  event: WebhookEventType,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    // Находим все активные webhooks для этого события
    const webhooks = await prisma.webhook.findMany({
      where: {
        organizationId,
        status: 'ACTIVE' as WebhookStatus,
      },
    })

    // Фильтруем webhooks, которые подписаны на это событие
    const matchingWebhooks = webhooks.filter((webhook: { id: string; events: string }) => {
      try {
        const events = JSON.parse(webhook.events) as string[]
        return events.includes(event)
      } catch {
        return false
      }
    })

    if (matchingWebhooks.length === 0) {
      return
    }

    // Создаём payload
    const payload: WebhookEventPayload = {
      event,
      entityId,
      data,
      occurredAt: new Date().toISOString(),
    }

    // Отправляем параллельно всем webhooks (fire-and-forget)
    void Promise.allSettled(matchingWebhooks.map((webhook) => deliverWebhook(webhook, payload)))
  } catch (error) {
    // Логируем ошибку, но не пробрасываем — не блокируем основной запрос
    console.error('[Webhook Dispatcher] Error dispatching event:', error)
  }
}

/**
 * Доставляет webhook на конкретный endpoint.
 * Принимает полный объект webhook (уже загружен в dispatchWebhookEvent).
 */
async function deliverWebhook(
  webhook: { id: string; url: string; secret: string; status: string },
  payload: WebhookEventPayload
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now()
  const webhookId = webhook.id

  // Создаём запись лога ДО отправки
  const log = await prisma.webhookLog.create({
    data: {
      webhookId,
      eventType: payload.event,
      eventId: payload.entityId,
      requestBody: JSON.stringify(payload),
      status: 'PENDING' as WebhookLogStatus,
      attempt: 1,
    },
  })

  const payloadString = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = createWebhookSignature(payloadString, webhook.secret, timestamp)
  const headers = createWebhookHeaders(payload.event, log.id, signature, timestamp)

  try {
    // Отправляем HTTP POST с таймаутом
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseTimeMs = Date.now() - startTime
    let responseBody = ''

    try {
      responseBody = await response.text()
      // Обрезаем до максимального размера
      if (responseBody.length > MAX_RESPONSE_BODY_SIZE) {
        responseBody = responseBody.slice(0, MAX_RESPONSE_BODY_SIZE) + '... (truncated)'
      }
    } catch {
      responseBody = '(unable to read response body)'
    }

    const success = response.ok // 2xx статус

    // Обновляем лог
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: {
        responseStatus: response.status,
        responseBody,
        responseTimeMs,
        status: success ? ('DELIVERED' as WebhookLogStatus) : ('FAILED' as WebhookLogStatus),
        errorMessage: success ? null : `HTTP ${response.status}`,
        nextRetryAt: success ? null : await calculateNextRetry(1),
      },
    })

    // Обновляем статистику webhook
    await updateWebhookStats(webhookId, success)

    return {
      success,
      logId: log.id,
      statusCode: response.status,
      responseTimeMs,
      error: success ? undefined : `HTTP ${response.status}`,
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Обновляем лог с ошибкой
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: {
        responseTimeMs,
        status: 'FAILED' as WebhookLogStatus,
        errorMessage,
        nextRetryAt: await calculateNextRetry(1),
      },
    })

    // Обновляем статистику webhook
    await updateWebhookStats(webhookId, false)

    return {
      success: false,
      logId: log.id,
      responseTimeMs,
      error: errorMessage,
    }
  }
}

// ============================================================================
// СТАТИСТИКА
// ============================================================================

/**
 * Обновляет статистику webhook и автоматически отключает при слишком большом количестве ошибок
 */
async function updateWebhookStats(webhookId: string, success: boolean): Promise<void> {
  const now = new Date()

  if (success) {
    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        successCount: { increment: 1 },
        consecutiveFailures: 0, // Сбрасываем счётчик ошибок
        lastTriggeredAt: now,
        lastSuccessAt: now,
      },
    })
  } else {
    const webhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: { increment: 1 },
        consecutiveFailures: { increment: 1 },
        lastTriggeredAt: now,
        lastFailureAt: now,
      },
    })

    // Auto-disable если слишком много последовательных ошибок
    if (webhook.consecutiveFailures >= AUTO_DISABLE_THRESHOLD) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          status: 'DISABLED' as WebhookStatus,
        },
      })

      console.warn(
        `[Webhook Dispatcher] Webhook ${webhookId} auto-disabled after ${webhook.consecutiveFailures} consecutive failures`
      )
    }
  }
}

// ============================================================================
// RETRY ЛОГИКА
// ============================================================================

/** Интервалы retry в секундах: 1м, 5м, 30м, 2ч, 8ч */
const RETRY_INTERVALS_SEC = [60, 300, 1800, 7200, 28800]

/**
 * Вычисляет время следующей попытки retry
 *
 * @param attempt - Номер текущей попытки (1-based)
 * @returns Date следующей попытки или null если попытки исчерпаны
 */
export async function calculateNextRetry(attempt: number): Promise<Date | null> {
  if (attempt > RETRY_INTERVALS_SEC.length) {
    return null // Все попытки исчерпаны
  }

  const delaySec = RETRY_INTERVALS_SEC[attempt - 1]
  return new Date(Date.now() + delaySec * 1000)
}

/**
 * Получает максимальное количество попыток retry
 */
export async function getMaxRetryAttempts(): Promise<number> {
  return RETRY_INTERVALS_SEC.length + 1 // +1 для первой попытки
}
