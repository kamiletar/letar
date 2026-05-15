/**
 * Метрики приложений: response time, error rate
 * Собираются через health-check запросы к приложениям
 * Хранение в PostgreSQL через ZenStack ORM
 */

import type { HealthCheck as HealthCheckDB, HealthStatus } from '@/generated/models'

import { prisma } from './db'

// Реэкспорт типов для обратной совместимости
export { HealthStatus } from '@/generated/models'

// Карта портов приложений (только dynamic apps с API routes)
const APP_PORTS: Record<string, number> = {
  'premium-rosstil': 3000,
  imot: 3001,
  dashboard: 3002,
  'driving-school': 3003,
  mandala: 3004,
  kami: 3005,
  'animatrona-landing': 3008,
  // pravda (3007) — статический экспорт, без API
}

// Интерфейсы (совместимость со старым API)
export interface HealthCheckResult {
  timestamp: Date
  responseTime: number // ms
  status: 'up' | 'down'
  statusCode: number | null
  error: string | null
}

export interface AppMetrics {
  app: string
  lastCheck: Date | null
  lastStatus: 'up' | 'down' | null
  avgResponseTime: number // ms, среднее за последний час
  minResponseTime: number // ms
  maxResponseTime: number // ms
  uptime: number // процент успешных запросов
  errorRate: number // процент ошибок
  totalChecks: number
  successfulChecks: number
  history: HealthCheckResult[]
}

// Максимальное количество записей для отображения
const MAX_HISTORY_DISPLAY = 20
// Время хранения данных (1 час)
const RETENTION_HOURS = 1

/**
 * Конвертация HealthStatus enum в строку
 */
function healthStatusToString(status: HealthStatus): 'up' | 'down' {
  return status === 'UP' ? 'up' : 'down'
}

/**
 * Конвертация строки в HealthStatus enum
 */
function stringToHealthStatus(status: 'up' | 'down'): HealthStatus {
  return status === 'up' ? 'UP' : 'DOWN'
}

/**
 * Конвертация DB модели в API формат
 */
function dbCheckToApiResult(check: HealthCheckDB): HealthCheckResult {
  return {
    timestamp: check.timestamp,
    responseTime: check.responseTime,
    status: healthStatusToString(check.status),
    statusCode: check.statusCode,
    error: check.error,
  }
}

/**
 * Сохраняет результат health-check в БД
 */
async function saveHealthCheckResult(app: string, result: HealthCheckResult): Promise<HealthCheckDB> {
  return prisma.healthCheck.create({
    data: {
      app,
      timestamp: result.timestamp,
      status: stringToHealthStatus(result.status),
      responseTime: result.responseTime,
      statusCode: result.statusCode,
      error: result.error,
    },
  })
}

/**
 * Выполняет health-check для приложения
 */
export async function performHealthCheck(app: string): Promise<HealthCheckResult> {
  const port = APP_PORTS[app]
  if (!port) {
    return {
      timestamp: new Date(),
      responseTime: 0,
      status: 'down',
      statusCode: null,
      error: `Неизвестное приложение: ${app}`,
    }
  }

  const url = `http://localhost:${port}/api/health`
  const startTime = performance.now()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10 сек таймаут

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const endTime = performance.now()
    const responseTime = Math.round(endTime - startTime)

    const result: HealthCheckResult = {
      timestamp: new Date(),
      responseTime,
      status: response.ok ? 'up' : 'down',
      statusCode: response.status,
      error: response.ok ? null : `HTTP ${response.status}`,
    }

    // Сохраняем результат в БД
    await saveHealthCheckResult(app, result)

    return result
  } catch (error) {
    const endTime = performance.now()
    const responseTime = Math.round(endTime - startTime)

    const result: HealthCheckResult = {
      timestamp: new Date(),
      responseTime,
      status: 'down',
      statusCode: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }

    // Сохраняем результат в БД
    await saveHealthCheckResult(app, result)

    return result
  }
}

/**
 * Получает полную историю за час для расчёта метрик
 */
async function getAppFullHistory(app: string): Promise<HealthCheckResult[]> {
  try {
    const oneHourAgo = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000)

    const checks = await prisma.healthCheck.findMany({
      where: {
        app,
        timestamp: { gte: oneHourAgo },
      },
      orderBy: { timestamp: 'desc' },
    })

    return checks.map(dbCheckToApiResult)
  } catch (error) {
    console.error(`Error getting full health check history for ${app}:`, error)
    return []
  }
}

/**
 * Получает метрики для приложения
 */
export async function getAppMetrics(app: string): Promise<AppMetrics> {
  const history = await getAppFullHistory(app)

  if (history.length === 0) {
    return {
      app,
      lastCheck: null,
      lastStatus: null,
      avgResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      uptime: 0,
      errorRate: 0,
      totalChecks: 0,
      successfulChecks: 0,
      history: [],
    }
  }

  // Фильтруем только успешные проверки для расчёта response time
  const successfulChecks = history.filter((h) => h.status === 'up')

  // Рассчитываем метрики
  const responseTimes = successfulChecks.map((h) => h.responseTime)
  const avgResponseTime =
    responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0
  const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0
  const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0

  const totalChecks = history.length
  const successCount = successfulChecks.length
  const uptime = Math.round((successCount / totalChecks) * 100 * 100) / 100
  const errorRate = Math.round(((totalChecks - successCount) / totalChecks) * 100 * 100) / 100

  // Получаем последние 20 записей для отображения
  const displayHistory = history.slice(0, MAX_HISTORY_DISPLAY)

  return {
    app,
    lastCheck: history[0]?.timestamp || null,
    lastStatus: history[0]?.status || null,
    avgResponseTime,
    minResponseTime,
    maxResponseTime,
    uptime,
    errorRate,
    totalChecks,
    successfulChecks: successCount,
    history: displayHistory,
  }
}

/**
 * Получает метрики для всех приложений
 */
export async function getAllAppMetrics(): Promise<AppMetrics[]> {
  const apps = Object.keys(APP_PORTS)
  const metrics = await Promise.all(apps.map((app) => getAppMetrics(app)))
  return metrics
}

/**
 * Выполняет health-check для всех приложений
 */
export async function performAllHealthChecks(): Promise<Record<string, HealthCheckResult>> {
  const results: Record<string, HealthCheckResult> = {}

  await Promise.all(
    Object.keys(APP_PORTS).map(async (app) => {
      results[app] = await performHealthCheck(app)
    })
  )

  return results
}

/**
 * Получает список доступных приложений
 */
export function getAvailableApps(): string[] {
  return Object.keys(APP_PORTS)
}

/**
 * Очистка старых записей (старше 1 часа)
 */
export async function cleanOldHealthChecks(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000)

  try {
    const result = await prisma.healthCheck.deleteMany({
      where: {
        timestamp: { lt: oneHourAgo },
      },
    })
    return result.count
  } catch (error) {
    console.error('Error cleaning old health checks:', error)
    return 0
  }
}
