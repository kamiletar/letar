/**
 * Reputation Service — Главный сервис репутации
 *
 * Подписывается на события статистики и пересчитывает репутацию.
 * Эмитит события при изменении ранга.
 */

import { EventEmitter } from 'events'

import type { RankChangedEvent, UserRank, UserReputation } from '../../../shared/types/reputation'
import { createModuleLogger } from '../../utils/logger'
import { getStatsTracker } from '../stats'
import { calculateReputation } from './reputation-calculator'
import { loadReputation, resetReputation, saveReputation } from './reputation-store'

const log = createModuleLogger('ReputationService')

/**
 * События сервиса репутации
 */
export interface ReputationServiceEvents {
  'reputation:updated': (reputation: UserReputation) => void
  'reputation:rankChanged': (event: RankChangedEvent) => void
}

/**
 * Сервис репутации
 */
class ReputationService extends EventEmitter {
  private static instance: ReputationService | null = null

  /** Текущая репутация (кэш) */
  private currentReputation: UserReputation | null = null

  /** Флаг инициализации */
  private isInitialized = false

  private constructor() {
    super()
  }

  /**
   * Получить singleton экземпляр
   */
  static getInstance(): ReputationService {
    if (!ReputationService.instance) {
      ReputationService.instance = new ReputationService()
    }
    return ReputationService.instance
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

    // Загружаем текущую репутацию
    this.currentReputation = loadReputation()

    // Подписываемся на события статистики
    this.subscribeToStats()

    this.isInitialized = true
    log.info('Инициализация завершена')
  }

  /**
   * Остановить сервис
   */
  shutdown(): void {
    log.info('Остановка...')
    this.isInitialized = false
    log.info('Остановлен')
  }

  /**
   * Подписаться на события статистики
   */
  private subscribeToStats(): void {
    const statsTracker = getStatsTracker()

    // При обновлении статистики — пересчитываем репутацию
    statsTracker.on('stats:updated', () => {
      this.recalculate()
    })

    // При начале сессии — пересчитываем (учитываем активное время)
    statsTracker.on('stats:sessionStarted', () => {
      this.recalculate()
    })

    // При завершении сессии — пересчитываем
    statsTracker.on('stats:sessionEnded', () => {
      this.recalculate()
    })
  }

  /**
   * Пересчитать репутацию
   */
  recalculate(): UserReputation {
    const statsTracker = getStatsTracker()
    const stats = statsTracker.getStats()

    const oldReputation = this.currentReputation
    const newReputation = calculateReputation(stats)

    // Сохраняем
    saveReputation(newReputation)
    this.currentReputation = newReputation

    // Эмитим событие обновления
    this.emit('reputation:updated', newReputation)

    // Проверяем изменение ранга
    if (oldReputation && oldReputation.rank !== newReputation.rank) {
      const rankEvent: RankChangedEvent = {
        oldRank: oldReputation.rank,
        newRank: newReputation.rank,
        score: newReputation.score,
      }
      this.emit('reputation:rankChanged', rankEvent)
      log.info('Ранг изменился', { oldRank: oldReputation.rank, newRank: newReputation.rank })
    }

    return newReputation
  }

  /**
   * Получить текущую репутацию
   */
  getReputation(): UserReputation {
    if (!this.currentReputation) {
      this.currentReputation = loadReputation()
    }
    return this.currentReputation
  }

  /**
   * Сбросить репутацию (для тестов)
   */
  reset(): UserReputation {
    const reputation = resetReputation()
    this.currentReputation = reputation
    this.emit('reputation:updated', reputation)
    return reputation
  }

  /**
   * Получить текущий ранг
   */
  getRank(): UserRank {
    return this.getReputation().rank
  }

  /**
   * Получить текущий score
   */
  getScore(): number {
    return this.getReputation().score
  }
}

/**
 * Получить singleton экземпляр ReputationService
 */
export function getReputationService(): ReputationService {
  return ReputationService.getInstance()
}
