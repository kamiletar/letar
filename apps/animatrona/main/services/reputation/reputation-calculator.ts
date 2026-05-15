/**
 * Reputation Calculator — Расчёт репутации пользователя
 *
 * Вычисляет score на основе метрик статистики.
 * Формула использует логарифмическую шкалу для более справедливого распределения.
 */

import {
  RANKS,
  REPUTATION_THRESHOLDS,
  REPUTATION_WEIGHTS,
  type UserRank,
  type UserReputation,
} from '../../../shared/types/reputation'
import type { UserStats } from '../../../shared/types/stats'

/**
 * Рассчитать score за соотношение upload/download
 *
 * Максимум 30 очков при ratio >= 3.0
 */
function calculateRatioScore(stats: UserStats): number {
  const uploaded = BigInt(stats.bytesUploaded || '0')
  const downloaded = BigInt(stats.bytesDownloaded || '0')

  // Если ничего не скачано, но есть upload — максимальный ratio
  if (downloaded === 0n && uploaded > 0n) {
    return REPUTATION_WEIGHTS.MAX_RATIO_SCORE
  }

  // Если ничего не было — 0
  if (downloaded === 0n) {
    return 0
  }

  // Ratio = upload / download
  // Используем Number для вычислений (достаточная точность для ratio)
  const ratio = Number(uploaded) / Number(downloaded)

  // Линейная интерполяция до порога
  const score = (ratio / REPUTATION_THRESHOLDS.RATIO_FOR_MAX) * REPUTATION_WEIGHTS.MAX_RATIO_SCORE

  return Math.min(REPUTATION_WEIGHTS.MAX_RATIO_SCORE, Math.round(score * 10) / 10)
}

/**
 * Рассчитать score за время раздачи
 *
 * Максимум 25 очков при 720 часах (30 дней)
 */
function calculateSeedingTimeScore(stats: UserStats): number {
  const totalMs = BigInt(stats.totalSeedingTimeMs || '0')
  const currentMs = BigInt(stats.currentSessionMs || '0')

  // Общее время в часах
  const totalHours = Number(totalMs + currentMs) / (1000 * 60 * 60)

  // Линейная интерполяция
  const score = (totalHours / REPUTATION_THRESHOLDS.SEEDING_HOURS_FOR_MAX) * REPUTATION_WEIGHTS.MAX_SEEDING_TIME_SCORE

  return Math.min(REPUTATION_WEIGHTS.MAX_SEEDING_TIME_SCORE, Math.round(score * 10) / 10)
}

/**
 * Рассчитать score за уникальный контент
 *
 * Максимум 20 очков при 100 уникальных CID
 */
function calculateUniqueContentScore(stats: UserStats): number {
  const count = stats.uniqueContentSeeded || 0

  // Логарифмическая шкала для более справедливого распределения
  // log10(1) = 0, log10(10) = 1, log10(100) = 2
  const logCount = count > 0 ? Math.log10(count + 1) : 0
  const logMax = Math.log10(REPUTATION_THRESHOLDS.UNIQUE_CONTENT_FOR_MAX + 1)

  const score = (logCount / logMax) * REPUTATION_WEIGHTS.MAX_UNIQUE_CONTENT_SCORE

  return Math.min(REPUTATION_WEIGHTS.MAX_UNIQUE_CONTENT_SCORE, Math.round(score * 10) / 10)
}

/**
 * Рассчитать score за помощь пирам
 *
 * Максимум 15 очков при 1000 пиров
 */
function calculateHelpedPeersScore(stats: UserStats): number {
  const count = stats.peersHelped || 0

  // Логарифмическая шкала
  const logCount = count > 0 ? Math.log10(count + 1) : 0
  const logMax = Math.log10(REPUTATION_THRESHOLDS.PEERS_HELPED_FOR_MAX + 1)

  const score = (logCount / logMax) * REPUTATION_WEIGHTS.MAX_HELPED_PEERS_SCORE

  return Math.min(REPUTATION_WEIGHTS.MAX_HELPED_PEERS_SCORE, Math.round(score * 10) / 10)
}

/**
 * Рассчитать score за время в сообществе
 *
 * Максимум 10 очков при 365 днях
 */
function calculateLongevityScore(stats: UserStats): number {
  if (!stats.firstSeedAt) {
    return 0
  }

  const firstSeedDate = new Date(stats.firstSeedAt)
  const now = new Date()
  const daysSinceFirst = (now.getTime() - firstSeedDate.getTime()) / (1000 * 60 * 60 * 24)

  // Линейная интерполяция
  const score = (daysSinceFirst / REPUTATION_THRESHOLDS.DAYS_FOR_MAX_LONGEVITY) * REPUTATION_WEIGHTS.MAX_LONGEVITY_SCORE

  return Math.min(REPUTATION_WEIGHTS.MAX_LONGEVITY_SCORE, Math.round(score * 10) / 10)
}

/**
 * Определить ранг по score
 */
function getRankByScore(score: number): UserRank {
  for (const [rank, info] of Object.entries(RANKS)) {
    if (score >= info.minScore && score < info.maxScore) {
      return rank as UserRank
    }
  }
  // По умолчанию — новичок
  return 'NEWCOMER' as UserRank
}

/**
 * Рассчитать полную репутацию на основе статистики
 */
export function calculateReputation(stats: UserStats): UserReputation {
  const ratioScore = calculateRatioScore(stats)
  const seedingTimeScore = calculateSeedingTimeScore(stats)
  const uniqueContentScore = calculateUniqueContentScore(stats)
  const helpedPeersScore = calculateHelpedPeersScore(stats)
  const longevityScore = calculateLongevityScore(stats)

  // Общий score — сумма компонентов
  const score = Math.round(ratioScore + seedingTimeScore + uniqueContentScore + helpedPeersScore + longevityScore)

  // Ограничиваем 0-100
  const clampedScore = Math.min(100, Math.max(0, score))

  const rank = getRankByScore(clampedScore)

  return {
    score: clampedScore,
    rank,
    ratioScore,
    seedingTimeScore,
    uniqueContentScore,
    helpedPeersScore,
    longevityScore,
    updatedAt: new Date().toISOString(),
  }
}
