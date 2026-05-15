/**
 * Achievement Checker — Проверка условий достижений
 *
 * Проверяет, выполнены ли условия для получения достижения.
 * Рассчитывает прогресс для каждого достижения.
 */

import type { Achievement, AchievementCondition, AchievementId } from '../../../shared/types/achievements'
import type { UserReputation } from '../../../shared/types/reputation'
import type { UserStats } from '../../../shared/types/stats'

/**
 * Контекст для проверки достижений
 */
export interface CheckContext {
  stats: UserStats
  reputation: UserReputation
}

/**
 * Результат проверки достижения
 */
export interface CheckResult {
  id: AchievementId
  isCompleted: boolean
  progress: number // 0-100
  currentValue: number
  targetValue: number
}

/**
 * Рассчитать ratio
 */
function calculateRatio(stats: UserStats): number {
  const uploaded = BigInt(stats.bytesUploaded || '0')
  const downloaded = BigInt(stats.bytesDownloaded || '0')

  if (downloaded === 0n) {
    return uploaded > 0n ? Infinity : 0
  }

  return Number(uploaded) / Number(downloaded)
}

/**
 * Получить общее время раздачи в мс
 */
function getTotalSeedingTime(stats: UserStats): number {
  const totalMs = BigInt(stats.totalSeedingTimeMs || '0')
  const currentMs = BigInt(stats.currentSessionMs || '0')
  return Number(totalMs + currentMs)
}

/**
 * Проверить условие достижения
 */
export function checkCondition(condition: AchievementCondition, context: CheckContext): CheckResult {
  const { stats, reputation } = context

  switch (condition.type) {
    case 'first_seed': {
      const hasFirstSeed = stats.firstSeedAt !== null
      return {
        id: 'FIRST_SEED' as AchievementId,
        isCompleted: hasFirstSeed,
        progress: hasFirstSeed ? 100 : 0,
        currentValue: hasFirstSeed ? 1 : 0,
        targetValue: 1,
      }
    }

    case 'upload_bytes': {
      const target = condition.target as number
      const current = Number(BigInt(stats.bytesUploaded || '0'))
      const progress = Math.min(100, (current / target) * 100)
      return {
        id: 'UPLOAD_1GB' as AchievementId,
        isCompleted: current >= target,
        progress,
        currentValue: current,
        targetValue: target,
      }
    }

    case 'seeding_time': {
      const target = condition.target as number
      const current = getTotalSeedingTime(stats)
      const progress = Math.min(100, (current / target) * 100)
      return {
        id: 'SEED_24H' as AchievementId,
        isCompleted: current >= target,
        progress,
        currentValue: current,
        targetValue: target,
      }
    }

    case 'peers_helped': {
      const target = condition.target as number
      const current = stats.peersHelped || 0
      const progress = Math.min(100, (current / target) * 100)
      return {
        id: 'HELP_10_PEERS' as AchievementId,
        isCompleted: current >= target,
        progress,
        currentValue: current,
        targetValue: target,
      }
    }

    case 'ratio': {
      const target = condition.target as number
      const current = calculateRatio(stats)
      const progress = current === Infinity ? 100 : Math.min(100, (current / target) * 100)
      return {
        id: 'RATIO_2X' as AchievementId,
        isCompleted: current >= target,
        progress,
        currentValue: current,
        targetValue: target,
      }
    }

    case 'unique_content': {
      const target = condition.target as number
      const current = stats.uniqueContentSeeded || 0
      const progress = Math.min(100, (current / target) * 100)
      return {
        id: 'CONTENT_10' as AchievementId,
        isCompleted: current >= target,
        progress,
        currentValue: current,
        targetValue: target,
      }
    }

    case 'rank': {
      const targetRank = condition.target as string
      const currentRank = reputation.rank

      // Порядок рангов
      const rankOrder = ['NEWCOMER', 'CONTRIBUTOR', 'REGULAR', 'VETERAN', 'LEGEND']
      const targetIndex = rankOrder.indexOf(targetRank)
      const currentIndex = rankOrder.indexOf(currentRank)

      const isCompleted = currentIndex >= targetIndex
      // Прогресс на основе score относительно минимального score ранга
      const rankMinScores: Record<string, number> = {
        NEWCOMER: 0,
        CONTRIBUTOR: 20,
        REGULAR: 40,
        VETERAN: 60,
        LEGEND: 80,
      }

      const targetMinScore = rankMinScores[targetRank] || 0
      const progress = Math.min(100, (reputation.score / targetMinScore) * 100)

      return {
        id: 'RANK_CONTRIBUTOR' as AchievementId,
        isCompleted,
        progress: isCompleted ? 100 : progress,
        currentValue: currentIndex,
        targetValue: targetIndex,
      }
    }

    default:
      return {
        id: 'FIRST_SEED' as AchievementId,
        isCompleted: false,
        progress: 0,
        currentValue: 0,
        targetValue: 0,
      }
  }
}

/**
 * Проверить достижение
 */
export function checkAchievement(achievement: Achievement, context: CheckContext): CheckResult {
  const result = checkCondition(achievement.condition, context)
  result.id = achievement.id
  return result
}
