/**
 * Система audit логирования Dashboard
 * Хранение в PostgreSQL через ZenStack ORM
 */

import type { AuditLog as AuditLogDB } from '@/generated/models'

import { prisma } from './db'

/**
 * Запись audit log (совместимость со старым API)
 */
export interface AuditLogEntry {
  timestamp: Date
  username: string
  role: string
  action: string
  resource?: string
  details?: Record<string, unknown>
  success: boolean
  error?: string
}

/**
 * Типы действий для audit log
 */
export type AuditAction =
  // Контейнеры
  | 'CONTAINER_START'
  | 'CONTAINER_STOP'
  | 'CONTAINER_RESTART'
  | 'CONTAINER_REMOVE'
  // Образы
  | 'IMAGE_REMOVE'
  | 'IMAGE_PRUNE'
  // Деплой
  | 'DEPLOY_START'
  | 'DEPLOY_STOP'
  // Бэкапы
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE'
  | 'BACKUP_DELETE'
  // Миграции
  | 'MIGRATION_EXECUTE'
  | 'MIGRATION_RUN'
  // Аутентификация
  | 'LOGIN'
  | 'LOGOUT'
  // Cron задачи
  | 'CRON_RUN'
  | 'CRON_ENABLE'
  | 'CRON_DISABLE'
  | 'CRON_TOGGLE'
  | 'CRON_UPDATE_SCHEDULE'
  | 'SCHEDULER_START'
  | 'SCHEDULER_STOP'
  // Настройки
  | 'SETTINGS_UPDATE'
  | 'ALERTS_ENABLE'
  | 'ALERTS_DISABLE'
  | 'ALERTS_TOGGLE'
  | 'TELEGRAM_ENABLE'
  | 'TELEGRAM_DISABLE'
  | 'TELEGRAM_TOGGLE'
  | 'TELEGRAM_TEST'
  | 'AUTO_CLEANUP_ENABLE'
  | 'AUTO_CLEANUP_DISABLE'
  | 'AUTO_CLEANUP_TOGGLE'
  | 'MONITORING_START'
  | 'MONITORING_STOP'
  | 'MONITORING_RESTART'
  // Nginx Proxy Manager
  | 'NPM_PROXY_HOST_TOGGLE'
  | 'NPM_PROXY_HOST_CREATE'
  | 'NPM_PROXY_HOST_UPDATE'
  | 'NPM_PROXY_HOST_DELETE'
  | 'NPM_CERTIFICATE_CREATE'
  | 'NPM_CERTIFICATE_DELETE'
  | 'NPM_ACCESS_LIST_CREATE'
  | 'NPM_ACCESS_LIST_UPDATE'
  | 'NPM_ACCESS_LIST_DELETE'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON поля в ZenStack требуют any
type JsonValue = Record<string, any>

/**
 * Конвертация DB модели в API формат
 */
function dbLogToApiEntry(log: AuditLogDB): AuditLogEntry {
  return {
    timestamp: log.timestamp,
    username: log.username,
    role: log.role,
    action: log.action,
    resource: log.resource ?? undefined,
    details: (log.details as JsonValue) ?? undefined,
    success: log.success,
    error: log.error ?? undefined,
  }
}

/**
 * Записывает событие в audit log
 *
 * @param entry - Запись audit log
 *
 * @example
 * ```ts
 * await logAuditEvent({
 *   username: session.user.username,
 *   role: session.user.role,
 *   action: 'CONTAINER_START',
 *   resource: 'premium-rosstil-app',
 *   success: true,
 * });
 * ```
 */
export async function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        username: entry.username,
        role: entry.role,
        action: entry.action,
        resource: entry.resource ?? null,
        success: entry.success,
        error: entry.error ?? null,
        ...(entry.details !== undefined && { details: entry.details as JsonValue }),
      },
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}

/**
 * Helper для логирования успешного действия
 */
export async function logSuccess(
  username: string,
  role: string,
  action: AuditAction,
  resource?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    username,
    role,
    action,
    resource,
    details,
    success: true,
  })
}

/**
 * Helper для логирования неудачного действия
 */
export async function logFailure(
  username: string,
  role: string,
  action: AuditAction,
  error: string,
  resource?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    username,
    role,
    action,
    resource,
    details,
    success: false,
    error,
  })
}

/**
 * Получить записи audit log с пагинацией и фильтрами
 */
export async function getAuditLogs(options?: {
  limit?: number
  offset?: number
  username?: string
  action?: string
  success?: boolean
  fromDate?: Date
  toDate?: Date
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const { limit = 50, offset = 0, username, action, success, fromDate, toDate } = options || {}

  try {
    // Формируем условия фильтрации
    const where: {
      username?: string
      action?: string
      success?: boolean
      timestamp?: { gte?: Date; lte?: Date }
    } = {}

    if (username) {
      where.username = username
    }
    if (action) {
      where.action = action
    }
    if (success !== undefined) {
      where.success = success
    }
    if (fromDate || toDate) {
      where.timestamp = {}
      if (fromDate) {
        where.timestamp.gte = fromDate
      }
      if (toDate) {
        where.timestamp.lte = toDate
      }
    }

    // Получаем записи и общее количество параллельно
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      logs: logs.map(dbLogToApiEntry),
      total,
    }
  } catch (error) {
    console.error('Failed to read audit logs:', error)
    return { logs: [], total: 0 }
  }
}

/**
 * Очистка старых audit логов (старше 90 дней)
 */
export async function cleanOldAuditLogs(): Promise<number> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: ninetyDaysAgo },
      },
    })
    return result.count
  } catch (error) {
    console.error('Failed to clean old audit logs:', error)
    return 0
  }
}
