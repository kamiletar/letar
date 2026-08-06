/**
 * Reputation Tracker
 *
 * Отслеживание репутации трекеров на основе истории взаимодействий.
 * Сохраняет историю проверок и вычисляет метрики.
 */

import type { PrismaClient } from '@prisma/client'

import type { TrustLevel, TrustMetrics } from '../../../../shared/types/federation'
import { calculateTrustScore, calculateUptime, getTrustLevel } from './trust-scoring'

/**
 * Запись проверки
 */
interface HealthCheck {
  trackerId: string
  success: boolean
  responseTimeMs: number
  timestamp: Date
}

/**
 * Максимальное количество записей истории на трекер
 */
const MAX_HISTORY_SIZE = 100

/**
 * In-memory хранилище истории проверок (для производительности)
 */
const healthCheckHistory = new Map<string, HealthCheck[]>()

/**
 * Reputation Tracker
 */
export class ReputationTracker {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Записать результат проверки трекера
   */
  async recordHealthCheck(trackerId: string, success: boolean, responseTimeMs: number): Promise<void> {
    // Добавляем в in-memory историю
    const history = healthCheckHistory.get(trackerId) ?? []
    history.push({
      trackerId,
      success,
      responseTimeMs,
      timestamp: new Date(),
    })

    // Ограничиваем размер истории
    if (history.length > MAX_HISTORY_SIZE) {
      history.shift()
    }
    healthCheckHistory.set(trackerId, history)

    // Обновляем метрики в БД
    await this.updateTrackerMetrics(trackerId)
  }

  /**
   * Получить метрики трекера
   */
  async getMetrics(trackerId: string): Promise<TrustMetrics> {
    const tracker = await this.prisma.tracker.findUnique({
      where: { id: trackerId },
    })

    if (!tracker) {
      return {
        uptimePercent: 0,
        avgResponseTimeMs: 0,
        contentQuality: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        lastCheckedAt: null,
      }
    }

    return {
      uptimePercent: tracker.uptimePercent,
      avgResponseTimeMs: tracker.avgResponseTimeMs,
      contentQuality: tracker.contentQuality,
      successfulSyncs: tracker.successfulSyncs,
      failedSyncs: tracker.failedSyncs,
      lastCheckedAt: tracker.lastCheckedAt?.toISOString() ?? null,
    }
  }

  /**
   * Получить trust score трекера
   */
  async getTrustScore(trackerId: string): Promise<number> {
    const metrics = await this.getMetrics(trackerId)
    return calculateTrustScore(metrics)
  }

  /**
   * Автоматически обновить trust level на основе метрик
   */
  async autoUpdateTrustLevel(trackerId: string): Promise<TrustLevel> {
    const tracker = await this.prisma.tracker.findUnique({
      where: { id: trackerId },
    })

    if (!tracker) {
      return 1 // UNTRUSTED
    }

    // Если трекер заблокирован вручную — не меняем
    if (tracker.trustLevel === 'BLOCKED') {
      return 0
    }

    const metrics = await this.getMetrics(trackerId)
    const score = calculateTrustScore(metrics)
    const newLevel = getTrustLevel(score)

    // Обновляем только если уровень изменился
    const currentLevel = this.dbToTrustLevel(tracker.trustLevel)
    if (newLevel !== currentLevel) {
      await this.prisma.tracker.update({
        where: { id: trackerId },
        data: { trustLevel: this.trustLevelToDb(newLevel) },
      })
    }

    return newLevel
  }

  /**
   * Установить качество контента
   */
  async setContentQuality(trackerId: string, quality: number): Promise<void> {
    await this.prisma.tracker.update({
      where: { id: trackerId },
      data: { contentQuality: Math.max(0, Math.min(1, quality)) },
    })
  }

  /**
   * Заблокировать трекер
   */
  async blockTracker(trackerId: string): Promise<void> {
    await this.prisma.tracker.update({
      where: { id: trackerId },
      data: { trustLevel: 'BLOCKED' },
    })
  }

  /**
   * Разблокировать трекер (сбросить на UNTRUSTED)
   */
  async unblockTracker(trackerId: string): Promise<void> {
    await this.prisma.tracker.update({
      where: { id: trackerId },
      data: { trustLevel: 'UNTRUSTED' },
    })
  }

  /**
   * Получить историю проверок
   */
  getHealthCheckHistory(trackerId: string): HealthCheck[] {
    return healthCheckHistory.get(trackerId) ?? []
  }

  /**
   * Очистить историю проверок
   */
  clearHistory(trackerId?: string): void {
    if (trackerId) {
      healthCheckHistory.delete(trackerId)
    } else {
      healthCheckHistory.clear()
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Обновить метрики трекера в БД
   */
  private async updateTrackerMetrics(trackerId: string): Promise<void> {
    const history = healthCheckHistory.get(trackerId) ?? []
    if (history.length === 0) {
      return
    }

    // Рассчитываем uptime
    const checks = history.map((h) => ({ success: h.success, timestamp: h.timestamp }))
    const uptimePercent = calculateUptime(checks)

    // Рассчитываем среднее время ответа (только успешных)
    const successfulChecks = history.filter((h) => h.success)
    const avgResponseTimeMs = successfulChecks.length > 0
      ? Math.round(successfulChecks.reduce((sum, h) => sum + h.responseTimeMs, 0) / successfulChecks.length)
      : 0

    await this.prisma.tracker.update({
      where: { id: trackerId },
      data: {
        uptimePercent,
        avgResponseTimeMs,
        lastCheckedAt: new Date(),
      },
    })
  }

  private dbToTrustLevel(level: string): TrustLevel {
    const map: Record<string, TrustLevel> = {
      BLOCKED: 0,
      UNTRUSTED: 1,
      KNOWN: 2,
      TRUSTED: 3,
      VERIFIED: 4,
    }
    return map[level] ?? 1
  }

  private trustLevelToDb(level: TrustLevel): string {
    const map: Record<number, string> = {
      0: 'BLOCKED',
      1: 'UNTRUSTED',
      2: 'KNOWN',
      3: 'TRUSTED',
      4: 'VERIFIED',
    }
    return map[level] ?? 'UNTRUSTED'
  }
}
