/**
 * Типы для системных метрик
 */

export type MetricTier = 'realtime' | 'hourly' | 'daily'

// Конфигурация хранения
export const TIERS = {
  realtime: {
    intervalMs: 30 * 1000, // 30 seconds
    retentionMs: 24 * 60 * 60 * 1000, // 24 hours
    aggregateToNext: 10, // 10 points (5 min) -> hourly tier
  },
  hourly: {
    intervalMs: 5 * 60 * 1000, // 5 minutes
    retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    aggregateToNext: 12, // 12 points (1 hour) -> daily tier
  },
  daily: {
    intervalMs: 60 * 60 * 1000, // 1 hour
    retentionMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    aggregateToNext: null,
  },
} as const

export interface SystemMetricPoint {
  timestamp: number
  cpu: number // Использование CPU %
  memory: number // Использование памяти %
  memoryUsed: number // Использовано памяти в байтах
  memoryTotal: number // Всего памяти в байтах
  disk: number // Использование корневого диска %
  diskUsed: number // Использовано диска в байтах
  diskTotal: number // Всего диска в байтах
  network?: {
    rxBytes: number // Принято байт
    txBytes: number // Отправлено байт
  }
}

export interface SystemMetricsHistory {
  tier: MetricTier
  points: SystemMetricPoint[]
  lastUpdated: number
}
