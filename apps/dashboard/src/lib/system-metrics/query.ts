/**
 * Запросы системных метрик
 */

import { prisma } from '../db'
import { dbMetricToApiPoint } from './storage'
import { type MetricTier, type SystemMetricPoint } from './types'

/**
 * Получить историю системных метрик для определённого временного диапазона
 */
export async function getSystemMetricsHistory(hours = 24): Promise<{ points: SystemMetricPoint[]; tier: MetricTier }> {
  const now = Date.now()
  const cutoff = now - hours * 60 * 60 * 1000

  // Выбираем подходящий уровень на основе запрошенного временного диапазона
  let tier: MetricTier
  if (hours <= 24) {
    tier = 'realtime'
  } else if (hours <= 168) {
    // 7 дней
    tier = 'hourly'
  } else {
    tier = 'daily'
  }

  try {
    const metrics = await prisma.systemMetric.findMany({
      where: {
        tier,
        timestamp: { gte: new Date(cutoff) },
      },
      orderBy: { timestamp: 'asc' },
    })

    const points = metrics.map(dbMetricToApiPoint)
    return { points, tier }
  } catch (error) {
    console.error(`Error getting system metrics history for tier ${tier}:`, error)
    return { points: [], tier }
  }
}

/**
 * Получить комбинированную историю из нескольких уровней для долгосрочных просмотров
 */
export async function getCombinedSystemMetrics(hours: number): Promise<SystemMetricPoint[]> {
  const now = Date.now()
  const cutoff = now - hours * 60 * 60 * 1000

  try {
    // Определяем временные границы для каждого уровня
    const realtimeCutoff = now - 24 * 60 * 60 * 1000
    const hourlyCutoff = now - 7 * 24 * 60 * 60 * 1000

    // Последние 24 часа: используем realtime
    if (cutoff >= realtimeCutoff) {
      // Запрошенный период целиком в realtime
      const metrics = await prisma.systemMetric.findMany({
        where: {
          tier: 'realtime',
          timestamp: { gte: new Date(cutoff) },
        },
        orderBy: { timestamp: 'asc' },
      })
      return metrics.map(dbMetricToApiPoint)
    }

    // Realtime часть (последние 24 часа)
    const realtimeMetrics = await prisma.systemMetric.findMany({
      where: {
        tier: 'realtime',
        timestamp: { gte: new Date(realtimeCutoff) },
      },
      orderBy: { timestamp: 'asc' },
    })
    const realtimePoints = realtimeMetrics.map(dbMetricToApiPoint)

    if (cutoff >= hourlyCutoff) {
      // Запрошенный период в hourly + realtime
      const hourlyMetrics = await prisma.systemMetric.findMany({
        where: {
          tier: 'hourly',
          timestamp: {
            gte: new Date(cutoff),
            lt: new Date(realtimeCutoff),
          },
        },
        orderBy: { timestamp: 'asc' },
      })
      const hourlyPoints = hourlyMetrics.map(dbMetricToApiPoint)
      return [...hourlyPoints, ...realtimePoints]
    }

    // Используем все три уровня
    // Daily часть
    const dailyMetrics = await prisma.systemMetric.findMany({
      where: {
        tier: 'daily',
        timestamp: {
          gte: new Date(cutoff),
          lt: new Date(hourlyCutoff),
        },
      },
      orderBy: { timestamp: 'asc' },
    })
    const dailyPoints = dailyMetrics.map(dbMetricToApiPoint)

    // Hourly часть
    const hourlyMetrics = await prisma.systemMetric.findMany({
      where: {
        tier: 'hourly',
        timestamp: {
          gte: new Date(hourlyCutoff),
          lt: new Date(realtimeCutoff),
        },
      },
      orderBy: { timestamp: 'asc' },
    })
    const hourlyPoints = hourlyMetrics.map(dbMetricToApiPoint)

    return [...dailyPoints, ...hourlyPoints, ...realtimePoints]
  } catch (error) {
    console.error('Error getting combined system metrics:', error)
    return []
  }
}

/**
 * Форматировать метрики для отображения на графике с подходящими метками гранулярности
 */
export function formatSystemMetricsForChart(
  points: SystemMetricPoint[],
  hours: number
): {
  cpu: Array<{ time: string; value: number; timestamp: number }>
  memory: Array<{ time: string; value: number; timestamp: number }>
  disk: Array<{ time: string; value: number; timestamp: number }>
} {
  const formatTime = (date: Date): string => {
    if (hours <= 24) {
      // Показываем только время
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else if (hours <= 168) {
      // Показываем день + время
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } else {
      // Показываем только дату
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      })
    }
  }

  return {
    cpu: points.map((p) => ({
      time: formatTime(new Date(p.timestamp)),
      value: Math.round(p.cpu * 10) / 10,
      timestamp: p.timestamp,
    })),
    memory: points.map((p) => ({
      time: formatTime(new Date(p.timestamp)),
      value: Math.round(p.memory * 10) / 10,
      timestamp: p.timestamp,
    })),
    disk: points.map((p) => ({
      time: formatTime(new Date(p.timestamp)),
      value: Math.round(p.disk * 10) / 10,
      timestamp: p.timestamp,
    })),
  }
}

/**
 * Получить статистику за временной период
 */
export function calculateMetricsStats(points: SystemMetricPoint[]): {
  cpu: { min: number; max: number; avg: number }
  memory: { min: number; max: number; avg: number }
  disk: { min: number; max: number; avg: number }
} | null {
  if (points.length === 0) {
    return null
  }

  const cpuValues = points.map((p) => p.cpu)
  const memoryValues = points.map((p) => p.memory)
  const diskValues = points.map((p) => p.disk)

  const calcStats = (values: number[]) => ({
    min: Math.round(Math.min(...values) * 10) / 10,
    max: Math.round(Math.max(...values) * 10) / 10,
    avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
  })

  return {
    cpu: calcStats(cpuValues),
    memory: calcStats(memoryValues),
    disk: calcStats(diskValues),
  }
}
