/**
 * Система алертов Dashboard
 * Хранение в PostgreSQL через ZenStack ORM
 */

import type { Alert, AlertSettings as AlertSettingsDB } from '@/generated/models'
import { ALERT_THRESHOLDS, RETENTION_DAYS } from '@/lib/constants'
import { prisma } from '@/lib/db'

// Тип для JSON metadata (совместим с ZenStack)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonMetadata = Record<string, any>

// Реэкспорт типов и enum'ов для обратной совместимости
export { AlertSeverity, AlertStatus, AlertType } from '@/generated/models'
export type { Alert } from '@/generated/models'

// Тип настроек с undefined вместо null для обратной совместимости
export interface AlertSettings {
  id: string
  enabled: boolean
  cpuThreshold: number
  memoryThreshold: number
  diskThreshold: number
  checkInterval: number
  telegramEnabled: boolean
  telegramBotToken?: string
  telegramChatId?: string
  updatedAt: Date
}

// ID singleton записи настроек
const SETTINGS_ID = 'default'

/**
 * Дефолтные настройки (с учётом env переменных)
 */
function getDefaultSettings(): Omit<AlertSettingsDB, 'id' | 'updatedAt'> {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || null
  const telegramChatId = process.env.TELEGRAM_CHAT_ID || null

  return {
    enabled: true,
    cpuThreshold: ALERT_THRESHOLDS.cpu,
    memoryThreshold: ALERT_THRESHOLDS.memory,
    diskThreshold: ALERT_THRESHOLDS.disk,
    checkInterval: 30,
    telegramEnabled: !!(telegramBotToken && telegramChatId),
    telegramBotToken,
    telegramChatId,
  }
}

/** Алерт с информацией о сервере */
export interface AlertWithServer extends Alert {
  server?: { id: string; name: string; displayName: string } | null
}

/**
 * Получение всех алертов (отсортированы по дате создания, новые сверху)
 * Включает информацию о сервере
 */
export async function getAlerts(): Promise<AlertWithServer[]> {
  try {
    return await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        server: {
          select: { id: true, name: true, displayName: true },
        },
      },
    })
  } catch (error) {
    console.error('Error reading alerts:', error)
    return []
  }
}

/**
 * Получение активных алертов
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  try {
    return await prisma.alert.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Error reading active alerts:', error)
    return []
  }
}

/**
 * Получение ID локального сервера (кэшируется)
 */
let cachedLocalServerId: string | null = null
async function getLocalServerId(): Promise<string | null> {
  if (cachedLocalServerId !== null) {
    return cachedLocalServerId
  }

  try {
    const localServer = await prisma.server.findFirst({
      where: { isLocal: true },
      select: { id: true },
    })
    cachedLocalServerId = localServer?.id ?? null
    return cachedLocalServerId
  } catch {
    return null
  }
}

/**
 * Создание нового алерта
 * Если активный алерт такого типа уже существует — обновляет его
 * serverId автоматически определяется как локальный сервер если не указан
 *
 * PLAN-INFRA.md §52: раньше дедуп шёл только по `type` (+ `serverId`) — для `CRON_FAILED`,
 * общего для ВСЕХ cron-задач монорепо, это схлопывало шесть разных сломанных задач у двух
 * разных приложений в один алерт, где `message` — от той, что упала последней. Пять остальных
 * были не видны нигде: чинишь одну — алерт остаётся активным от других. Если вызывающий код
 * передал `metadata.jobId` (как это делает `dashboard-agent` для `CRON_FAILED` — см.
 * `notifyDashboardAlert()` в `apps/dashboard-agent/src/lib/cron.ts`) — дедуп сужается до
 * `type` + этого `jobId`, и у каждой задачи свой активный алерт. Алерты без `jobId` в metadata
 * (например по CPU/памяти/диску) дедуплицируются как раньше — по `type` (+`serverId`).
 */
export async function createAlert(
  type: Alert['type'],
  severity: Alert['severity'],
  title: string,
  message: string,
  metadata?: JsonMetadata,
  serverId?: string | null,
): Promise<Alert> {
  try {
    // Если serverId не указан, используем локальный сервер
    const resolvedServerId = serverId ?? (await getLocalServerId())
    const jobId = typeof metadata?.['jobId'] === 'string' ? metadata['jobId'] : undefined

    // Проверяем существующий активный алерт такого типа (+ jobId, если он есть) на этом сервере
    const existingAlert = await prisma.alert.findFirst({
      where: {
        type,
        status: 'ACTIVE',
        ...(resolvedServerId ? { serverId: resolvedServerId } : {}),
        // path — JSONPath (Postgres-диалект ZenStack строит его через jsonb_path_query_first),
        // а не голое имя ключа: обязателен префикс `$.`.
        ...(jobId ? { metadata: { path: '$.jobId', equals: jobId } } : {}),
      },
    })

    if (existingAlert) {
      // Обновляем существующий. `title` и `lastOccurredAt` тоже обновляются — раньше обновлялся
      // только `message`, и заголовок + время первого срабатывания (например, от давно
      // неактуальной задачи) навсегда прилипали к записи, пока она остаётся ACTIVE, даже когда
      // причина провала сменилась или алерт сработал заново сильно позже.
      return await prisma.alert.update({
        where: { id: existingAlert.id },
        data: {
          title,
          message,
          lastOccurredAt: new Date(),
          ...(metadata !== undefined && { metadata }),
        },
      })
    }

    // Создаём новый
    return await prisma.alert.create({
      data: {
        type,
        severity,
        status: 'ACTIVE',
        title,
        message,
        lastOccurredAt: new Date(),
        ...(metadata !== undefined && { metadata }),
        ...(resolvedServerId && { serverId: resolvedServerId }),
      },
    })
  } catch (error) {
    console.error('Error creating alert:', error)
    throw error
  }
}

/**
 * Подтверждение алерта (acknowledged)
 */
export async function acknowledgeAlert(alertId: string): Promise<boolean> {
  try {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    })
    return true
  } catch (error) {
    console.error('Error acknowledging alert:', error)
    return false
  }
}

/**
 * Разрешение алерта (resolved)
 */
export async function resolveAlert(alertId: string): Promise<boolean> {
  try {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    })
    return true
  } catch (error) {
    console.error('Error resolving alert:', error)
    return false
  }
}

/**
 * Разрешение всех активных алертов определённого типа
 */
export async function resolveAlertsByType(type: Alert['type']): Promise<number> {
  try {
    const result = await prisma.alert.updateMany({
      where: { type, status: 'ACTIVE' },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    })
    return result.count
  } catch (error) {
    console.error('Error resolving alerts by type:', error)
    return 0
  }
}

/**
 * Конвертация null в undefined для обратной совместимости
 */
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

/**
 * Получение настроек алертов
 * Если настроек нет — создаёт дефолтные
 */
export async function getAlertSettings(): Promise<AlertSettings> {
  const defaults = getDefaultSettings()

  try {
    let settings = await prisma.alertSettings.findUnique({
      where: { id: SETTINGS_ID },
    })

    if (!settings) {
      // Создаём дефолтные настройки
      settings = await prisma.alertSettings.create({
        data: { id: SETTINGS_ID, ...defaults },
      })
    }

    // Env переменные имеют приоритет для токенов (если заданы)
    const botToken = defaults.telegramBotToken || settings.telegramBotToken
    const chatId = defaults.telegramChatId || settings.telegramChatId

    return {
      id: settings.id,
      enabled: settings.enabled,
      cpuThreshold: settings.cpuThreshold,
      memoryThreshold: settings.memoryThreshold,
      diskThreshold: settings.diskThreshold,
      checkInterval: settings.checkInterval,
      telegramEnabled: settings.telegramEnabled,
      telegramBotToken: nullToUndefined(botToken),
      telegramChatId: nullToUndefined(chatId),
      updatedAt: settings.updatedAt,
    }
  } catch (error) {
    console.error('Error reading alert settings:', error)
    // Возвращаем дефолтные настройки как fallback
    return {
      id: SETTINGS_ID,
      enabled: defaults.enabled,
      cpuThreshold: defaults.cpuThreshold,
      memoryThreshold: defaults.memoryThreshold,
      diskThreshold: defaults.diskThreshold,
      checkInterval: defaults.checkInterval,
      telegramEnabled: defaults.telegramEnabled,
      telegramBotToken: nullToUndefined(defaults.telegramBotToken),
      telegramChatId: nullToUndefined(defaults.telegramChatId),
      updatedAt: new Date(),
    }
  }
}

/**
 * Сохранение настроек алертов
 */
export async function saveAlertSettings(settings: Omit<AlertSettings, 'id' | 'updatedAt'>): Promise<void> {
  try {
    // Конвертируем undefined в null для БД
    const dbSettings = {
      enabled: settings.enabled,
      cpuThreshold: settings.cpuThreshold,
      memoryThreshold: settings.memoryThreshold,
      diskThreshold: settings.diskThreshold,
      checkInterval: settings.checkInterval,
      telegramEnabled: settings.telegramEnabled,
      telegramBotToken: settings.telegramBotToken ?? null,
      telegramChatId: settings.telegramChatId ?? null,
    }

    await prisma.alertSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...dbSettings },
      update: dbSettings,
    })
  } catch (error) {
    console.error('Error saving alert settings:', error)
    throw error
  }
}

/**
 * Очистка старых resolved алертов (старше RETENTION_DAYS.alerts дней)
 */
export async function cleanOldAlerts(): Promise<number> {
  const cutoffDate = new Date(Date.now() - RETENTION_DAYS.alerts * 24 * 60 * 60 * 1000)

  try {
    const result = await prisma.alert.deleteMany({
      where: {
        status: 'RESOLVED',
        resolvedAt: { lt: cutoffDate },
      },
    })
    return result.count
  } catch (error) {
    console.error('Error cleaning old alerts:', error)
    return 0
  }
}
