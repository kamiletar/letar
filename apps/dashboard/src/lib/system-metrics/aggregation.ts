/**
 * Агрегация системных метрик между уровнями
 */

import { prisma } from '../db'
import { dbMetricToApiPoint, getLastMetricPoint, saveMetricPoint } from './storage'
import { type MetricTier, type SystemMetricPoint, TIERS } from './types'

// Кэш для последнего времени обновления
const lastUpdateCache = new Map<MetricTier, number>()

/**
 * Агрегировать несколько точек в одну (средние значения)
 */
export function aggregatePoints(points: SystemMetricPoint[]): SystemMetricPoint {
  if (points.length === 0) {
    throw new Error('Cannot aggregate empty points array')
  }

  const sum = points.reduce(
    (acc, p) => ({
      cpu: acc.cpu + p.cpu,
      memory: acc.memory + p.memory,
      memoryUsed: acc.memoryUsed + p.memoryUsed,
      memoryTotal: acc.memoryTotal + p.memoryTotal,
      disk: acc.disk + p.disk,
      diskUsed: acc.diskUsed + p.diskUsed,
      diskTotal: acc.diskTotal + p.diskTotal,
      rxBytes: acc.rxBytes + (p.network?.rxBytes || 0),
      txBytes: acc.txBytes + (p.network?.txBytes || 0),
    }),
    {
      cpu: 0,
      memory: 0,
      memoryUsed: 0,
      memoryTotal: 0,
      disk: 0,
      diskUsed: 0,
      diskTotal: 0,
      rxBytes: 0,
      txBytes: 0,
    },
  )

  const count = points.length
  const hasNetwork = points.some((p) => p.network)

  return {
    timestamp: points[points.length - 1].timestamp, // Используем временную метку последней точки
    cpu: sum.cpu / count,
    memory: sum.memory / count,
    memoryUsed: Math.round(sum.memoryUsed / count),
    memoryTotal: Math.round(sum.memoryTotal / count),
    disk: sum.disk / count,
    diskUsed: Math.round(sum.diskUsed / count),
    diskTotal: Math.round(sum.diskTotal / count),
    ...(hasNetwork && {
      network: {
        rxBytes: Math.round(sum.rxBytes / count),
        txBytes: Math.round(sum.txBytes / count),
      },
    }),
  }
}

/**
 * Выполнить агрегацию с одного уровня на следующий
 */
export async function aggregateToNextTier(
  fromTier: MetricTier,
  toTier: MetricTier,
  pointsToAggregate: number,
): Promise<void> {
  try {
    // Получаем последнюю агрегированную точку на целевом уровне
    const lastAggregated = await getLastMetricPoint(toTier)
    const lastAggregatedTs = lastAggregated?.timestamp || 0

    // Получаем точки из исходного уровня, которые ещё не были агрегированы
    const retentionMs = TIERS[fromTier].retentionMs
    const cutoff = new Date(Date.now() - retentionMs)

    const newMetrics = await prisma.systemMetric.findMany({
      where: {
        tier: fromTier,
        timestamp: {
          gte: cutoff,
          gt: new Date(lastAggregatedTs),
        },
      },
      orderBy: { timestamp: 'asc' },
    })

    const newPoints = newMetrics.map(dbMetricToApiPoint)

    // Группируем точки в чанки для агрегации
    const chunks: SystemMetricPoint[][] = []
    for (let i = 0; i < newPoints.length; i += pointsToAggregate) {
      const chunk = newPoints.slice(i, i + pointsToAggregate)
      if (chunk.length === pointsToAggregate) {
        chunks.push(chunk)
      }
    }

    if (chunks.length === 0) {
      return
    }

    // Агрегируем каждый чанк и сохраняем на следующий уровень
    for (const chunk of chunks) {
      const aggregatedPoint = aggregatePoints(chunk)
      await saveMetricPoint(toTier, aggregatedPoint)
    }
  } catch (error) {
    console.error(`Error aggregating from ${fromTier} to ${toTier}:`, error)
  }
}

/**
 * Добавить новую точку системных метрик
 * Автоматически обрабатывает агрегацию на более высокие уровни
 */
export async function addSystemMetricPoint(point: Omit<SystemMetricPoint, 'timestamp'>): Promise<boolean> {
  const now = Date.now()
  const tierConfig = TIERS.realtime

  // Проверяем кэш последнего обновления
  const lastUpdate = lastUpdateCache.get('realtime') || 0
  if (now - lastUpdate < tierConfig.intervalMs - 5000) {
    return false
  }

  try {
    // Добавляем новую точку
    const newPoint: SystemMetricPoint = {
      ...point,
      timestamp: now,
    }
    await saveMetricPoint('realtime', newPoint)
    lastUpdateCache.set('realtime', now)

    // Проверяем нужно ли агрегировать на следующий уровень
    // Подсчитываем количество точек с последней агрегации
    const lastHourlyPoint = await getLastMetricPoint('hourly')
    const lastHourlyTs = lastHourlyPoint?.timestamp || 0

    const realtimeCountSinceAggregation = await prisma.systemMetric.count({
      where: {
        tier: 'realtime',
        timestamp: { gt: new Date(lastHourlyTs) },
      },
    })

    if (realtimeCountSinceAggregation >= tierConfig.aggregateToNext) {
      await aggregateToNextTier('realtime', 'hourly', tierConfig.aggregateToNext)

      // Проверяем агрегацию hourly -> daily
      const lastDailyPoint = await getLastMetricPoint('daily')
      const lastDailyTs = lastDailyPoint?.timestamp || 0

      const hourlyCountSinceAggregation = await prisma.systemMetric.count({
        where: {
          tier: 'hourly',
          timestamp: { gt: new Date(lastDailyTs) },
        },
      })

      if (hourlyCountSinceAggregation >= TIERS.hourly.aggregateToNext) {
        await aggregateToNextTier('hourly', 'daily', TIERS.hourly.aggregateToNext)
      }
    }

    return true
  } catch (error) {
    console.error('Error adding system metric point:', error)
    return false
  }
}
