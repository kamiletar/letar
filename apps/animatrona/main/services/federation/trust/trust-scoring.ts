/**
 * Trust Scoring
 *
 * Расчёт уровня доверия к трекерам на основе метрик.
 * Использует взвешенную формулу с учётом:
 * - Uptime
 * - Время ответа
 * - Качество контента
 * - История синхронизаций
 */

import type { TrustLevel, TrustMetrics } from '../../../../shared/types/federation'

/**
 * Веса для расчёта trust score
 */
const WEIGHTS = {
  uptime: 0.25, // 25% — стабильность работы
  responseTime: 0.15, // 15% — скорость ответа
  quality: 0.25, // 25% — качество контента
  syncSuccess: 0.35, // 35% — история успешных синхронизаций
}

/**
 * Пороги для уровней доверия
 */
const TRUST_THRESHOLDS = {
  BLOCKED: 0, // Заблокирован вручную
  UNTRUSTED: 0, // 0-25
  KNOWN: 25, // 25-50
  TRUSTED: 50, // 50-75
  VERIFIED: 75, // 75-100
}

/**
 * Максимальное приемлемое время ответа (мс)
 */
const MAX_ACCEPTABLE_RESPONSE_TIME = 5000

/**
 * Рассчитать trust score (0-100)
 */
export function calculateTrustScore(metrics: TrustMetrics): number {
  // Uptime score (0-100)
  const uptimeScore = metrics.uptimePercent

  // Response time score (0-100, инвертированный)
  // 0ms = 100, MAX_ACCEPTABLE_RESPONSE_TIME = 0
  const responseScore = Math.max(0, 100 - (metrics.avgResponseTimeMs / MAX_ACCEPTABLE_RESPONSE_TIME) * 100)

  // Quality score (0-100)
  const qualityScore = metrics.contentQuality * 100

  // Sync success rate (0-100)
  const totalSyncs = metrics.successfulSyncs + metrics.failedSyncs
  const syncScore = totalSyncs > 0 ? (metrics.successfulSyncs / totalSyncs) * 100 : 50 // Neutral для новых трекеров

  // Взвешенная сумма
  const score =
    uptimeScore * WEIGHTS.uptime +
    responseScore * WEIGHTS.responseTime +
    qualityScore * WEIGHTS.quality +
    syncScore * WEIGHTS.syncSuccess

  return Math.round(Math.max(0, Math.min(100, score)))
}

/**
 * Получить trust level на основе score
 */
export function getTrustLevel(score: number, isBlocked = false): TrustLevel {
  if (isBlocked) {
    return 0
  } // BLOCKED

  if (score >= TRUST_THRESHOLDS.VERIFIED) {
    return 4
  } // VERIFIED
  if (score >= TRUST_THRESHOLDS.TRUSTED) {
    return 3
  } // TRUSTED
  if (score >= TRUST_THRESHOLDS.KNOWN) {
    return 2
  } // KNOWN
  return 1 // UNTRUSTED
}

/**
 * Получить название trust level
 */
export function getTrustLevelName(level: TrustLevel): string {
  const names: Record<TrustLevel, string> = {
    0: 'Заблокирован',
    1: 'Не доверенный',
    2: 'Известный',
    3: 'Доверенный',
    4: 'Верифицированный',
  }
  return names[level] ?? 'Неизвестный'
}

/**
 * Получить цвет для trust level (для UI)
 */
export function getTrustLevelColor(level: TrustLevel): string {
  const colors: Record<TrustLevel, string> = {
    0: 'red',
    1: 'gray',
    2: 'yellow',
    3: 'green',
    4: 'blue',
  }
  return colors[level] ?? 'gray'
}

/**
 * Проверить, разрешена ли операция для данного trust level
 */
export function isOperationAllowed(level: TrustLevel, operation: 'view' | 'sync' | 'autoImport' | 'pin'): boolean {
  const minLevels: Record<string, TrustLevel> = {
    view: 1, // UNTRUSTED и выше
    sync: 2, // KNOWN и выше
    autoImport: 3, // TRUSTED и выше
    pin: 3, // TRUSTED и выше
  }

  return level >= minLevels[operation]
}

/**
 * Обновить метрики после взаимодействия
 */
export function updateMetricsAfterInteraction(
  currentMetrics: TrustMetrics,
  interaction: {
    success: boolean
    responseTimeMs: number
  }
): TrustMetrics {
  const _totalInteractions = currentMetrics.successfulSyncs + currentMetrics.failedSyncs + 1

  // Экспоненциальное скользящее среднее для времени ответа
  const alpha = 0.2 // Коэффициент сглаживания
  const newAvgResponseTime = Math.round(
    alpha * interaction.responseTimeMs + (1 - alpha) * currentMetrics.avgResponseTimeMs
  )

  return {
    ...currentMetrics,
    avgResponseTimeMs: newAvgResponseTime,
    successfulSyncs: interaction.success ? currentMetrics.successfulSyncs + 1 : currentMetrics.successfulSyncs,
    failedSyncs: interaction.success ? currentMetrics.failedSyncs : currentMetrics.failedSyncs + 1,
    lastCheckedAt: new Date().toISOString(),
  }
}

/**
 * Рассчитать uptime на основе истории проверок
 */
export function calculateUptime(checks: { success: boolean; timestamp: Date }[]): number {
  if (checks.length === 0) {
    return 0
  }

  const successfulChecks = checks.filter((c) => c.success).length
  return (successfulChecks / checks.length) * 100
}

/**
 * Создать начальные метрики для нового трекера
 */
export function createInitialMetrics(): TrustMetrics {
  return {
    uptimePercent: 0,
    avgResponseTimeMs: 0,
    contentQuality: 0.5, // Neutral
    successfulSyncs: 0,
    failedSyncs: 0,
    lastCheckedAt: null,
  }
}
