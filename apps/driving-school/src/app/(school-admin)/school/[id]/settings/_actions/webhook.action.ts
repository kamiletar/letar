'use server'

/**
 * Server Actions для управления Webhooks школы
 *
 * CRUD операции для webhooks организации.
 */

import { z } from 'zod/v4'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateWebhookSecret } from '@/lib/webhooks'
import type { WebhookEventType, WebhookLogStatus, WebhookStatus } from '@letar/driving-school-db/prisma'

// ============================================================================
// СХЕМЫ ВАЛИДАЦИИ
// ============================================================================

/** Валидные типы событий */
const VALID_EVENTS: WebhookEventType[] = [
  'LESSON_CONFIRMED',
  'LESSON_CANCELLED',
  'LESSON_COMPLETED',
  'LESSON_NO_SHOW',
  'PAYMENT_RECEIVED',
  'ENROLLMENT_REQUEST_APPROVED',
  'ENROLLMENT_REQUEST_REJECTED',
  'STUDENT_TRANSFER_ACCEPTED',
  'STUDENT_TRANSFER_REJECTED',
  'REVIEW_CREATED',
]

const CreateWebhookSchema = z
  .object({
    organizationId: z.string().cuid(),
    name: z.string().min(1).max(100),
    url: z.url(),
    events: z.array(z.enum(VALID_EVENTS as [WebhookEventType, ...WebhookEventType[]])).min(1),
  })
  .strip()

const UpdateWebhookSchema = z
  .object({
    webhookId: z.string().cuid(),
    name: z.string().min(1).max(100).optional(),
    url: z.url().optional(),
    events: z
      .array(z.enum(VALID_EVENTS as [WebhookEventType, ...WebhookEventType[]]))
      .min(1)
      .optional(),
    status: z.enum(['ACTIVE', 'PAUSED'] as const).optional(),
  })
  .strip()

const DeleteWebhookSchema = z
  .object({
    webhookId: z.string().cuid(),
  })
  .strip()

const TestWebhookSchema = z
  .object({
    webhookId: z.string().cuid(),
  })
  .strip()

// ============================================================================
// ТИПЫ
// ============================================================================

export interface WebhookListItem {
  id: string
  name: string
  url: string
  events: WebhookEventType[]
  status: WebhookStatus
  successCount: number
  failureCount: number
  lastTriggeredAt: Date | null
  createdAt: Date
}

export interface WebhookDetail extends WebhookListItem {
  secret: string
  consecutiveFailures: number
  lastSuccessAt: Date | null
  lastFailureAt: Date | null
  createdBy: {
    id: string
    name: string | null
  }
}

export interface WebhookLogItem {
  id: string
  eventType: WebhookEventType
  eventId: string
  status: WebhookLogStatus
  responseStatus: number | null
  responseTimeMs: number | null
  attempt: number
  errorMessage: string | null
  createdAt: Date
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Получает список webhooks организации
 */
export async function getWebhooksAction(
  organizationId: string
): Promise<{ success: true; webhooks: WebhookListItem[] } | { success: false; error: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    // Проверяем членство в организации
    const member = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
    })

    if (!member) {
      return { success: false, error: 'FORBIDDEN' }
    }

    const webhooks = await prisma.webhook.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      webhooks: webhooks.map((w) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        events: JSON.parse(w.events) as WebhookEventType[],
        status: w.status,
        successCount: w.successCount,
        failureCount: w.failureCount,
        lastTriggeredAt: w.lastTriggeredAt,
        createdAt: w.createdAt,
      })),
    }
  } catch (error) {
    console.error('Ошибка получения webhooks:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

/**
 * Получает детали webhook (включая секрет)
 */
export async function getWebhookDetailAction(
  webhookId: string
): Promise<{ success: true; webhook: WebhookDetail } | { success: false; error: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        organization: {
          include: {
            members: {
              where: {
                userId: session.user.id,
                role: { in: ['owner', 'super_manager', 'manager'] },
              },
            },
          },
        },
      },
    })

    if (!webhook) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем членство
    if (webhook.organization.members.length === 0) {
      return { success: false, error: 'FORBIDDEN' }
    }

    return {
      success: true,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        secret: webhook.secret,
        events: JSON.parse(webhook.events) as WebhookEventType[],
        status: webhook.status,
        successCount: webhook.successCount,
        failureCount: webhook.failureCount,
        consecutiveFailures: webhook.consecutiveFailures,
        lastTriggeredAt: webhook.lastTriggeredAt,
        lastSuccessAt: webhook.lastSuccessAt,
        lastFailureAt: webhook.lastFailureAt,
        createdAt: webhook.createdAt,
        createdBy: {
          id: webhook.createdBy.id,
          name: webhook.createdBy.name,
        },
      },
    }
  } catch (error) {
    console.error('Ошибка получения деталей webhook:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

/**
 * Создаёт новый webhook
 */
export async function createWebhookAction(
  input: unknown
): Promise<{ success: true; webhook: WebhookListItem } | { success: false; error: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = CreateWebhookSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  const { organizationId, name, url, events } = parsed.data

  try {
    // Проверяем права (только owner/super_manager)
    const member = await prisma.member.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'super_manager'] },
      },
    })

    if (!member) {
      return { success: false, error: 'FORBIDDEN' }
    }

    // Генерируем секретный ключ
    const secret = generateWebhookSecret()

    const webhook = await prisma.webhook.create({
      data: {
        organizationId,
        name,
        url,
        secret,
        events: JSON.stringify(events),
        status: 'ACTIVE' as WebhookStatus,
        createdById: session.user.id,
      },
    })

    return {
      success: true,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: events,
        status: webhook.status,
        successCount: webhook.successCount,
        failureCount: webhook.failureCount,
        lastTriggeredAt: webhook.lastTriggeredAt,
        createdAt: webhook.createdAt,
      },
    }
  } catch (error) {
    console.error('Ошибка создания webhook:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

/**
 * Обновляет webhook
 */
export async function updateWebhookAction(
  input: unknown
): Promise<{ success: true; webhook: WebhookListItem } | { success: false; error: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = UpdateWebhookSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  const { webhookId, name, url, events, status } = parsed.data

  try {
    // Получаем webhook и проверяем права
    const existingWebhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId: session.user.id,
                role: { in: ['owner', 'super_manager'] },
              },
            },
          },
        },
      },
    })

    if (!existingWebhook) {
      return { success: false, error: 'NOT_FOUND' }
    }

    if (existingWebhook.organization.members.length === 0) {
      return { success: false, error: 'FORBIDDEN' }
    }

    const webhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(events && { events: JSON.stringify(events) }),
        ...(status && { status: status as WebhookStatus }),
        // При реактивации сбрасываем счётчик ошибок
        ...(status === 'ACTIVE' && { consecutiveFailures: 0 }),
      },
    })

    return {
      success: true,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: events ?? (JSON.parse(webhook.events) as WebhookEventType[]),
        status: webhook.status,
        successCount: webhook.successCount,
        failureCount: webhook.failureCount,
        lastTriggeredAt: webhook.lastTriggeredAt,
        createdAt: webhook.createdAt,
      },
    }
  } catch (error) {
    console.error('Ошибка обновления webhook:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

/**
 * Удаляет webhook
 */
export async function deleteWebhookAction(
  input: unknown
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = DeleteWebhookSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  const { webhookId } = parsed.data

  try {
    // Получаем webhook и проверяем права
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId: session.user.id,
                role: { in: ['owner', 'super_manager'] },
              },
            },
          },
        },
      },
    })

    if (!webhook) {
      return { success: false, error: 'NOT_FOUND' }
    }

    if (webhook.organization.members.length === 0) {
      return { success: false, error: 'FORBIDDEN' }
    }

    // Удаляем webhook (логи удалятся каскадно)
    await prisma.webhook.delete({
      where: { id: webhookId },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления webhook:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

/**
 * Регенерирует секретный ключ webhook
 */
export async function regenerateWebhookSecretAction(
  webhookId: string
): Promise<{ success: true; secret: string } | { success: false; error: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    // Получаем webhook и проверяем права
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId: session.user.id,
                role: { in: ['owner', 'super_manager'] },
              },
            },
          },
        },
      },
    })

    if (!webhook) {
      return { success: false, error: 'NOT_FOUND' }
    }

    if (webhook.organization.members.length === 0) {
      return { success: false, error: 'FORBIDDEN' }
    }

    const newSecret = generateWebhookSecret()

    await prisma.webhook.update({
      where: { id: webhookId },
      data: { secret: newSecret },
    })

    return { success: true, secret: newSecret }
  } catch (error) {
    console.error('Ошибка регенерации секрета:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

/**
 * Получает логи webhook
 */
export async function getWebhookLogsAction(
  webhookId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ success: true; logs: WebhookLogItem[]; total: number } | { success: false; error: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  try {
    // Получаем webhook и проверяем права
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId: session.user.id,
                role: { in: ['owner', 'super_manager', 'manager'] },
              },
            },
          },
        },
      },
    })

    if (!webhook) {
      return { success: false, error: 'NOT_FOUND' }
    }

    if (webhook.organization.members.length === 0) {
      return { success: false, error: 'FORBIDDEN' }
    }

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.webhookLog.count({
        where: { webhookId },
      }),
    ])

    return {
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        eventType: log.eventType,
        eventId: log.eventId,
        status: log.status,
        responseStatus: log.responseStatus,
        responseTimeMs: log.responseTimeMs,
        attempt: log.attempt,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
      })),
      total,
    }
  } catch (error) {
    console.error('Ошибка получения логов webhook:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

/**
 * Тестирует webhook отправкой тестового события
 */
export async function testWebhookAction(
  input: unknown
): Promise<{ success: true; statusCode: number; responseTimeMs: number } | { success: false; error: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = TestWebhookSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  const { webhookId } = parsed.data

  try {
    // Получаем webhook и проверяем права
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId: session.user.id,
                role: { in: ['owner', 'super_manager'] },
              },
            },
          },
        },
      },
    })

    if (!webhook) {
      return { success: false, error: 'NOT_FOUND' }
    }

    if (webhook.organization.members.length === 0) {
      return { success: false, error: 'FORBIDDEN' }
    }

    // Отправляем тестовый запрос
    const { createWebhookHeaders, createWebhookSignature } = await import('@/lib/webhooks')

    const testPayload = {
      event: 'test',
      entityId: 'test-123',
      data: {
        message: 'This is a test webhook from Driving School',
        triggeredBy: session.user.name || session.user.email,
        timestamp: new Date().toISOString(),
      },
      occurredAt: new Date().toISOString(),
    }

    const payloadString = JSON.stringify(testPayload)
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = createWebhookSignature(payloadString, webhook.secret, timestamp)
    const headers = createWebhookHeaders('test', 'test-delivery', signature, timestamp)

    const startTime = Date.now()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseTimeMs = Date.now() - startTime

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    return {
      success: true,
      statusCode: response.status,
      responseTimeMs,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}
