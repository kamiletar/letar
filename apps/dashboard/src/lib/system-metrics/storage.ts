/**
 * Хранение и загрузка системных метрик
 */

import type { SystemMetric as SystemMetricDB } from '@/generated/models'
import { prisma } from '../db'
import { type MetricTier, type SystemMetricPoint, type SystemMetricsHistory, TIERS } from './types'

/**
 * Конвертация DB модели в API формат
 */
export function dbMetricToApiPoint(metric: SystemMetricDB): SystemMetricPoint {
  const result: SystemMetricPoint = {
    timestamp: metric.timestamp.getTime(),
    cpu: metric.cpu,
    memory: metric.memory,
    memoryUsed: Number(metric.memoryUsed),
    memoryTotal: Number(metric.memoryTotal),
    disk: metric.disk,
    diskUsed: Number(metric.diskUsed),
    diskTotal: Number(metric.diskTotal),
  }

  // Добавляем network только если есть данные
  if (metric.networkRx !== null && metric.networkTx !== null) {
    result.network = {
      rxBytes: Number(metric.networkRx),
      txBytes: Number(metric.networkTx),
    }
  }

  return result
}

/**
 * Загрузить историю метрик для уровня
 */
export async function loadSystemMetrics(tier: MetricTier): Promise<SystemMetricsHistory> {
  try {
    const retentionMs = TIERS[tier].retentionMs
    const cutoff = new Date(Date.now() - retentionMs)

    const metrics = await prisma.systemMetric.findMany({
      where: {
        tier,
        timestamp: { gte: cutoff },
      },
      orderBy: { timestamp: 'asc' },
    })

    const points = metrics.map(dbMetricToApiPoint)
    const lastMetric = metrics[metrics.length - 1]

    return {
      tier,
      points,
      lastUpdated: lastMetric?.timestamp.getTime() || 0,
    }
  } catch (error) {
    console.error(`Error loading system metrics for tier ${tier}:`, error)
    return {
      tier,
      points: [],
      lastUpdated: 0,
    }
  }
}

/**
 * Сохранить точку метрик в БД
 */
export async function saveMetricPoint(tier: MetricTier, point: SystemMetricPoint): Promise<void> {
  await prisma.systemMetric.create({
    data: {
      timestamp: new Date(point.timestamp),
      tier,
      cpu: point.cpu,
      memory: point.memory,
      memoryUsed: BigInt(point.memoryUsed),
      memoryTotal: BigInt(point.memoryTotal),
      disk: point.disk,
      diskUsed: BigInt(point.diskUsed),
      diskTotal: BigInt(point.diskTotal),
      networkRx: point.network ? BigInt(point.network.rxBytes) : null,
      networkTx: point.network ? BigInt(point.network.txBytes) : null,
    },
  })
}

/**
 * Получить последнюю точку для уровня (для определения времени последней агрегации)
 */
export async function getLastMetricPoint(tier: MetricTier): Promise<SystemMetricPoint | null> {
  const metric = await prisma.systemMetric.findFirst({
    where: { tier },
    orderBy: { timestamp: 'desc' },
  })

  return metric ? dbMetricToApiPoint(metric) : null
}

/**
 * Очистка устаревших данных (запускать периодически)
 */
export async function cleanupOldMetrics(): Promise<number> {
  const now = Date.now()
  let totalDeleted = 0

  try {
    // Очищаем realtime (храним 24 часа)
    const realtimeResult = await prisma.systemMetric.deleteMany({
      where: {
        tier: 'realtime',
        timestamp: { lt: new Date(now - TIERS.realtime.retentionMs) },
      },
    })
    totalDeleted += realtimeResult.count

    // Очищаем hourly (храним 7 дней)
    const hourlyResult = await prisma.systemMetric.deleteMany({
      where: {
        tier: 'hourly',
        timestamp: { lt: new Date(now - TIERS.hourly.retentionMs) },
      },
    })
    totalDeleted += hourlyResult.count

    // Очищаем daily (храним 30 дней)
    const dailyResult = await prisma.systemMetric.deleteMany({
      where: {
        tier: 'daily',
        timestamp: { lt: new Date(now - TIERS.daily.retentionMs) },
      },
    })
    totalDeleted += dailyResult.count

    return totalDeleted
  } catch (error) {
    console.error('Error cleaning up old metrics:', error)
    return 0
  }
}
