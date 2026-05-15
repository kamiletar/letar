/**
 * System Metrics модуль
 *
 * Многоуровневое хранение системных метрик:
 * - Realtime: каждые 30 сек, храним 24 часа
 * - Hourly: каждые 5 мин агрегированно, храним 7 дней
 * - Daily: каждый 1 час агрегированно, храним 30 дней
 *
 * Декомпозирован на подмодули:
 * - types.ts — типы и конфигурация
 * - storage.ts — загрузка/сохранение в БД
 * - aggregation.ts — агрегация между уровнями
 * - query.ts — запросы и форматирование
 */

// Типы
export { TIERS } from './types'
export type { MetricTier, SystemMetricPoint, SystemMetricsHistory } from './types'

// Storage
export {
  cleanupOldMetrics,
  dbMetricToApiPoint,
  getLastMetricPoint,
  loadSystemMetrics,
  saveMetricPoint,
} from './storage'

// Aggregation
export { addSystemMetricPoint, aggregatePoints, aggregateToNextTier } from './aggregation'

// Query
export {
  calculateMetricsStats,
  formatSystemMetricsForChart,
  getCombinedSystemMetrics,
  getSystemMetricsHistory,
} from './query'
