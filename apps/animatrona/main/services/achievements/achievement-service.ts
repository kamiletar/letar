/**
 * Achievement Service — Главный сервис достижений
 *
 * Подписывается на события статистики и репутации,
 * проверяет условия достижений и разблокирует их.
 */

import { EventEmitter } from 'events'

import { createModuleLogger } from '../../utils/logger'

import type {
  Achievement,
  AchievementUnlockedEvent,
  AchievementWithProgress,
  UserAchievements,
} from '../../../shared/types/achievements'
import { getReputationService } from '../reputation'
import { getStatsTracker } from '../stats'
import { checkAchievement, type CheckContext } from './achievement-checker'
import { ACHIEVEMENTS, getAchievementById } from './achievement-definitions'
import {
  isAchievementUnlocked,
  loadAchievements,
  markAsNotified,
  resetAchievements,
  unlockAchievement,
  updateProgress,
} from './achievements-store'

const log = createModuleLogger('AchievementService')

/**
 * События сервиса достижений
 */
export interface AchievementServiceEvents {
  'achievements:unlocked': (event: AchievementUnlockedEvent) => void
  'achievements:progress': (id: string, progress: number) => void
}

/**
 * Сервис достижений
 */
class AchievementService extends EventEmitter {
  private static instance: AchievementService | null = null

  /** Флаг инициализации */
  private isInitialized = false

  private constructor() {
    super()
  }

  /**
   * Получить singleton экземпляр
   */
  static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService()
    }
    return AchievementService.instance
  }

  /**
   * Инициализировать сервис
   */
  initialize(): void {
    if (this.isInitialized) {
      log.info('Уже инициализирован')
      return
    }

    log.info('Инициализация...')

    // Подписываемся на события
    this.subscribeToEvents()

    this.isInitialized = true
    log.info('Инициализация завершена')
  }

  /**
   * Остановить сервис
   */
  shutdown(): void {
    log.info('Остановка...')
    if (this.checkDebounceTimer) {
      clearTimeout(this.checkDebounceTimer)
      this.checkDebounceTimer = null
    }
    this.isInitialized = false
    log.info('Остановлен')
  }

  /** Debounce таймер для checkAllAchievements */
  private checkDebounceTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Подписаться на события статистики и репутации
   */
  private subscribeToEvents(): void {
    const statsTracker = getStatsTracker()
    const reputationService = getReputationService()

    // При обновлении статистики — проверяем достижения (debounce 2 сек)
    const debouncedCheck = () => {
      if (this.checkDebounceTimer) {
        clearTimeout(this.checkDebounceTimer)
      }
      this.checkDebounceTimer = setTimeout(() => {
        this.checkDebounceTimer = null
        this.checkAllAchievements()
      }, 2000)
    }

    statsTracker.on('stats:updated', debouncedCheck)

    // При изменении ранга — проверяем достижения рангов
    reputationService.on('reputation:rankChanged', debouncedCheck)
  }

  /**
   * Получить контекст для проверки достижений
   */
  private getCheckContext(): CheckContext {
    const statsTracker = getStatsTracker()
    const reputationService = getReputationService()

    return {
      stats: statsTracker.getStats(),
      reputation: reputationService.getReputation(),
    }
  }

  /**
   * Проверить все достижения
   */
  checkAllAchievements(): void {
    const context = this.getCheckContext()
    const achievements = loadAchievements()

    for (const achievement of ACHIEVEMENTS) {
      // Пропускаем уже разблокированные
      if (isAchievementUnlocked(achievement.id)) {
        continue
      }

      const result = checkAchievement(achievement, context)

      // Обновляем прогресс
      if (result.progress !== achievements.progress[achievement.id]) {
        updateProgress(achievement.id, result.progress)
        this.emit('achievements:progress', achievement.id, result.progress)
      }

      // Разблокируем если выполнено
      if (result.isCompleted) {
        this.unlock(achievement)
      }
    }
  }

  /**
   * Разблокировать достижение
   */
  private unlock(achievement: Achievement): void {
    try {
      unlockAchievement(achievement.id)

      const event: AchievementUnlockedEvent = {
        achievement,
        bonusEarned: achievement.bonusReward,
      }

      this.emit('achievements:unlocked', event)
      log.info('Разблокировано достижение', { name: achievement.name, bonusReward: achievement.bonusReward })
    } catch {
      // Уже разблокировано
    }
  }

  /**
   * Получить все достижения с прогрессом
   */
  getAllWithProgress(): AchievementWithProgress[] {
    const achievements = loadAchievements()
    const context = this.getCheckContext()

    return ACHIEVEMENTS.map((achievement) => {
      const unlocked = achievements.unlocked.find((a) => a.id === achievement.id)
      const result = checkAchievement(achievement, context)

      return {
        ...achievement,
        progress: unlocked ? 100 : result.progress,
        isUnlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt || null,
      }
    })
  }

  /**
   * Получить разблокированные достижения
   */
  getUnlocked(): AchievementWithProgress[] {
    return this.getAllWithProgress().filter((a) => a.isUnlocked)
  }

  /**
   * Получить заблокированные достижения
   */
  getLocked(): AchievementWithProgress[] {
    return this.getAllWithProgress().filter((a) => !a.isUnlocked)
  }

  /**
   * Отметить достижение как показанное
   */
  markNotified(id: string): void {
    markAsNotified(id as never)
  }

  /**
   * Получить данные достижений
   */
  getAchievements(): UserAchievements {
    return loadAchievements()
  }

  /**
   * Получить определение достижения по ID
   */
  getAchievementDefinition(id: string): Achievement | undefined {
    return getAchievementById(id as never)
  }

  /**
   * Сбросить достижения (для тестов)
   */
  reset(): UserAchievements {
    return resetAchievements()
  }
}

/**
 * Получить singleton экземпляр AchievementService
 */
export function getAchievementService(): AchievementService {
  return AchievementService.getInstance()
}

// Реэкспорт для удобства
export { ACHIEVEMENTS, getAchievementById } from './achievement-definitions'
