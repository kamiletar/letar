'use server'

/**
 * Server Actions для управления правилами напоминаний (Фаза 18)
 */

import { requireAuth } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'
import type { ReminderType } from '@letar/driving-school-db/prisma'
import { revalidatePath } from 'next/cache'
import {
  type ToggleReminderRuleData,
  ToggleReminderRuleSchema,
  type UpsertReminderRuleData,
  UpsertReminderRuleSchema,
} from '../_schemas/reminder-rules.schema'

// === Типы ===

export interface ReminderRuleSummary {
  id: string
  type: ReminderType
  enabled: boolean
  triggerDays: number[]
  pushEnabled: boolean
  emailEnabled: boolean
  telegramEnabled: boolean
  sendToStudent: boolean
  sendToManager: boolean
  escalateAfterDays: number | null
  updatedAt: string
}

export interface ReminderLogSummary {
  id: string
  type: ReminderType
  recipientName: string | null
  targetType: string | null
  channels: string[]
  status: string
  daysBeforeEvent: number | null
  createdAt: string
}

export type GetReminderRulesResult =
  | { success: true; rules: ReminderRuleSummary[] }
  | { success: false; error: ActionErrorCode }

export type GetReminderRuleResult =
  | { success: true; rule: ReminderRuleSummary }
  | { success: false; error: ActionErrorCode }

export type UpsertReminderRuleResult =
  | { success: true; ruleId: string }
  | { success: false; error: ActionErrorCode; message?: string }

export type ToggleReminderRuleResult = { success: true } | { success: false; error: ActionErrorCode }

export type GetReminderLogsResult =
  | { success: true; logs: ReminderLogSummary[]; total: number }
  | { success: false; error: ActionErrorCode }

// === Вспомогательные функции ===

async function requireSchoolMember(organizationId: string) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return authResult
  }

  const { user } = authResult

  // Владелец платформы имеет доступ ко всем школам
  if (user.roles.includes('OWNER')) {
    return { success: true as const, user }
  }

  // Проверяем членство с правом управления настройками
  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
  })

  if (!membership || !['owner', 'super_manager'].includes(membership.role)) {
    return { success: false as const, error: 'NOT_SCHOOL_ADMIN' as ActionErrorCode }
  }

  return { success: true as const, user }
}

// === Actions ===

/**
 * Получает все правила напоминаний для организации
 */
export async function getReminderRulesAction(organizationId: string): Promise<GetReminderRulesResult> {
  const authResult = await requireSchoolMember(organizationId)
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    const db = getEnhancedPrisma(authResult.user)

    const rules = await db.reminderRule.findMany({
      where: { organizationId },
      orderBy: { type: 'asc' },
    })

    return {
      success: true,
      rules: rules.map((rule) => ({
        id: rule.id,
        type: rule.type,
        enabled: rule.enabled,
        triggerDays: rule.triggerDays,
        pushEnabled: rule.pushEnabled,
        emailEnabled: rule.emailEnabled,
        telegramEnabled: rule.telegramEnabled,
        sendToStudent: rule.sendToStudent,
        sendToManager: rule.sendToManager,
        escalateAfterDays: rule.escalateAfterDays,
        updatedAt: rule.updatedAt.toISOString(),
      })),
    }
  } catch (error) {
    console.error('[ReminderRules] Ошибка получения правил:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Получает конкретное правило по типу
 */
export async function getReminderRuleByTypeAction(
  organizationId: string,
  type: ReminderType
): Promise<GetReminderRuleResult> {
  const authResult = await requireSchoolMember(organizationId)
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    const db = getEnhancedPrisma(authResult.user)

    const rule = await db.reminderRule.findUnique({
      where: {
        organizationId_type: {
          organizationId,
          type,
        },
      },
    })

    if (!rule) {
      return { success: false, error: 'NOT_FOUND' }
    }

    return {
      success: true,
      rule: {
        id: rule.id,
        type: rule.type,
        enabled: rule.enabled,
        triggerDays: rule.triggerDays,
        pushEnabled: rule.pushEnabled,
        emailEnabled: rule.emailEnabled,
        telegramEnabled: rule.telegramEnabled,
        sendToStudent: rule.sendToStudent,
        sendToManager: rule.sendToManager,
        escalateAfterDays: rule.escalateAfterDays,
        updatedAt: rule.updatedAt.toISOString(),
      },
    }
  } catch (error) {
    console.error('[ReminderRules] Ошибка получения правила:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Создаёт или обновляет правило напоминания
 */
export async function upsertReminderRuleAction(input: unknown): Promise<UpsertReminderRuleResult> {
  const parsed = UpsertReminderRuleSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR', message: parsed.error.message }
  }

  const data: UpsertReminderRuleData = parsed.data
  const authResult = await requireSchoolMember(data.organizationId)
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    const db = getEnhancedPrisma(authResult.user)

    const rule = await db.reminderRule.upsert({
      where: {
        organizationId_type: {
          organizationId: data.organizationId,
          type: data.type,
        },
      },
      create: {
        organizationId: data.organizationId,
        type: data.type,
        enabled: data.enabled,
        triggerDays: data.triggerDays,
        pushEnabled: data.pushEnabled,
        emailEnabled: data.emailEnabled,
        telegramEnabled: data.telegramEnabled,
        sendToStudent: data.sendToStudent,
        sendToManager: data.sendToManager,
        escalateAfterDays: data.escalateAfterDays ?? null,
      },
      update: {
        enabled: data.enabled,
        triggerDays: data.triggerDays,
        pushEnabled: data.pushEnabled,
        emailEnabled: data.emailEnabled,
        telegramEnabled: data.telegramEnabled,
        sendToStudent: data.sendToStudent,
        sendToManager: data.sendToManager,
        escalateAfterDays: data.escalateAfterDays ?? null,
      },
    })

    revalidatePath(`/school/${data.organizationId}/settings/reminders`)

    return { success: true, ruleId: rule.id }
  } catch (error) {
    console.error('[ReminderRules] Ошибка сохранения правила:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Переключает статус правила (вкл/выкл)
 */
export async function toggleReminderRuleAction(input: unknown): Promise<ToggleReminderRuleResult> {
  const parsed = ToggleReminderRuleSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  const data: ToggleReminderRuleData = parsed.data

  // Получаем правило чтобы узнать organizationId
  const rule = await prisma.reminderRule.findUnique({
    where: { id: data.ruleId },
    select: { organizationId: true },
  })

  if (!rule) {
    return { success: false, error: 'NOT_FOUND' }
  }

  const authResult = await requireSchoolMember(rule.organizationId)
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    const db = getEnhancedPrisma(authResult.user)

    await db.reminderRule.update({
      where: { id: data.ruleId },
      data: { enabled: data.enabled },
    })

    revalidatePath(`/school/${rule.organizationId}/settings/reminders`)

    return { success: true }
  } catch (error) {
    console.error('[ReminderRules] Ошибка переключения правила:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Получает логи напоминаний для организации
 */
export async function getReminderLogsAction(
  organizationId: string,
  options?: { limit?: number; offset?: number; type?: ReminderType }
): Promise<GetReminderLogsResult> {
  const authResult = await requireSchoolMember(organizationId)
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    const limit = options?.limit || 50
    const offset = options?.offset || 0

    // Получаем ID правил этой организации
    const rules = await prisma.reminderRule.findMany({
      where: { organizationId },
      select: { id: true },
    })
    const ruleIds = rules.map((r) => r.id)

    const [logs, total] = await Promise.all([
      prisma.reminderLog.findMany({
        where: {
          ruleId: { in: ruleIds },
          ...(options?.type ? { type: options.type } : {}),
        },
        include: {
          recipient: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.reminderLog.count({
        where: {
          ruleId: { in: ruleIds },
          ...(options?.type ? { type: options.type } : {}),
        },
      }),
    ])

    return {
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        type: log.type,
        recipientName: log.recipient.name,
        targetType: log.targetType,
        channels: log.channels,
        status: log.status,
        daysBeforeEvent: log.daysBeforeEvent,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
    }
  } catch (error) {
    console.error('[ReminderRules] Ошибка получения логов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
