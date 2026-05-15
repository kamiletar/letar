/**
 * Bonus Service — главный сервис для бонусных очков
 */

import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'

import { createModuleLogger } from '../../utils/logger'

import type { BonusItem, BonusPoints, BonusTransaction, BonusTransactionType } from '../../../shared/types/bonus-points'
import { getAchievementService } from '../achievements'
import { getStatsTracker } from '../stats'
import { calculateEarning, canAfford, type EarningContext, type EarningResult } from './bonus-calculator'
import { addTransaction, loadBonusPoints, resetBonusPoints, saveBonusPoints } from './bonus-store'

const log = createModuleLogger('BonusService')

/**
 * Событие изменения баланса
 */
export interface BalanceChangedEvent {
  oldBalance: number
  newBalance: number
  transaction: BonusTransaction
}

/**
 * Результат траты очков
 */
export interface SpendResult {
  success: boolean
  error?: string
  transaction?: BonusTransaction
  newBalance?: number
}

/**
 * Bonus Service — синглтон
 */
class BonusService extends EventEmitter {
  private static instance: BonusService | null = null
  private bonusPoints: BonusPoints = { balance: 0, totalEarned: 0, totalSpent: 0, transactions: [] }
  private initialized = false
  private loadedFromDisk = false

  private constructor() {
    super()
  }

  /** Загрузить данные с диска (вызывается лениво при первом обращении) */
  private async ensureLoaded(): Promise<void> {
    if (!this.loadedFromDisk) {
      this.bonusPoints = await loadBonusPoints()
      this.loadedFromDisk = true
    }
  }

  /**
   * Получает singleton экземпляр
   */
  static getInstance(): BonusService {
    if (!BonusService.instance) {
      BonusService.instance = new BonusService()
    }
    return BonusService.instance
  }

  /**
   * Инициализирует сервис и подписывается на события
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }
    await this.ensureLoaded()

    // Подписка на достижения
    const achievementService = getAchievementService()
    achievementService.on('achievements:unlocked', (event) => {
      const achievement = event.achievement
      if (achievement.bonusReward > 0) {
        this.addPoints('achievement', achievement.bonusReward, `Достижение: ${achievement.name}`, {
          achievementId: achievement.id,
        })
      }
    })

    // Подписка на статистику (раздача)
    const statsTracker = getStatsTracker()
    statsTracker.on('stats:bytesUploaded', (bytesUploaded: number) => {
      // Начисляем очки за каждые 100 MB раздачи
      const EARNING_THRESHOLD = 100 * 1024 * 1024 // 100 MB
      if (bytesUploaded >= EARNING_THRESHOLD) {
        const context: EarningContext = {
          bytesUploaded,
          timestamp: new Date(),
        }
        const result = this.earnFromSeeding(context)
        if (result.totalPoints > 0) {
          log.info('Начислено очков за раздачу', { totalPoints: result.totalPoints })
        }
      }
    })

    this.initialized = true
    log.info('Инициализирован')
  }

  /**
   * Получает текущие бонусные очки
   */
  getBonusPoints(): BonusPoints {
    return { ...this.bonusPoints }
  }

  /**
   * Получает текущий баланс
   */
  getBalance(): number {
    return this.bonusPoints.balance
  }

  /**
   * Получает историю транзакций
   */
  getTransactions(limit?: number): BonusTransaction[] {
    const transactions = [...this.bonusPoints.transactions].reverse()
    return limit ? transactions.slice(0, limit) : transactions
  }

  /**
   * Добавляет очки
   */
  addPoints(
    type: BonusTransactionType,
    amount: number,
    description: string,
    metadata?: Record<string, unknown>,
  ): BonusTransaction {
    const oldBalance = this.bonusPoints.balance

    const transaction: BonusTransaction = {
      id: randomUUID(),
      type,
      amount: Math.abs(amount), // Всегда положительное для добавления
      balance: oldBalance + Math.abs(amount),
      description,
      createdAt: new Date().toISOString(),
      metadata,
    }

    this.bonusPoints = addTransaction(this.bonusPoints, transaction)
    saveBonusPoints(this.bonusPoints)

    this.emit('bonus:balanceChanged', {
      oldBalance,
      newBalance: this.bonusPoints.balance,
      transaction,
    } as BalanceChangedEvent)

    this.emit('bonus:pointsEarned', {
      amount: transaction.amount,
      type,
      description,
    })

    return transaction
  }

  /**
   * Тратит очки
   */
  spend(amount: number, description: string, metadata?: Record<string, unknown>): SpendResult {
    if (amount <= 0) {
      return { success: false, error: 'Сумма должна быть положительной' }
    }

    if (!canAfford(this.bonusPoints.balance, amount)) {
      return { success: false, error: 'Недостаточно очков' }
    }

    const oldBalance = this.bonusPoints.balance

    const transaction: BonusTransaction = {
      id: randomUUID(),
      type: 'spending',
      amount: -amount, // Отрицательное для траты
      balance: oldBalance - amount,
      description,
      createdAt: new Date().toISOString(),
      metadata,
    }

    this.bonusPoints = addTransaction(this.bonusPoints, transaction)
    saveBonusPoints(this.bonusPoints)

    this.emit('bonus:balanceChanged', {
      oldBalance,
      newBalance: this.bonusPoints.balance,
      transaction,
    } as BalanceChangedEvent)

    this.emit('bonus:pointsSpent', {
      amount,
      description,
    })

    return {
      success: true,
      transaction,
      newBalance: this.bonusPoints.balance,
    }
  }

  /**
   * Покупает предмет
   */
  purchaseItem(item: BonusItem): SpendResult {
    if (!item.available) {
      return { success: false, error: 'Предмет недоступен' }
    }

    return this.spend(item.price, `Покупка: ${item.name}`, {
      itemId: item.id,
      category: item.category,
    })
  }

  /**
   * Зарабатывает очки за раздачу
   */
  earnFromSeeding(context: EarningContext): EarningResult {
    const result = calculateEarning(context)

    if (result.totalPoints > 0) {
      let description = `Раздача: ${(context.bytesUploaded / (1024 * 1024 * 1024)).toFixed(2)} GB`
      if (result.appliedMultipliers.length > 0) {
        description += ` (x${result.multiplier})`
      }

      this.addPoints('earning', result.totalPoints, description, {
        bytesUploaded: context.bytesUploaded,
        multipliers: result.appliedMultipliers,
      })
    }

    return result
  }

  /**
   * Начисляет бонус (администрирование)
   */
  grantBonus(amount: number, reason: string): BonusTransaction {
    return this.addPoints('bonus', amount, reason, { grantedAt: new Date().toISOString() })
  }

  /**
   * Корректировка баланса (администрирование)
   */
  adjustBalance(amount: number, reason: string): BonusTransaction {
    const type: BonusTransactionType = 'adjustment'
    const oldBalance = this.bonusPoints.balance

    const transaction: BonusTransaction = {
      id: randomUUID(),
      type,
      amount,
      balance: oldBalance + amount,
      description: reason,
      createdAt: new Date().toISOString(),
      metadata: { adjustedAt: new Date().toISOString() },
    }

    this.bonusPoints = addTransaction(this.bonusPoints, transaction)
    saveBonusPoints(this.bonusPoints)

    this.emit('bonus:balanceChanged', {
      oldBalance,
      newBalance: this.bonusPoints.balance,
      transaction,
    } as BalanceChangedEvent)

    return transaction
  }

  /**
   * Сбрасывает бонусы (для тестов)
   */
  reset(): BonusPoints {
    this.bonusPoints = resetBonusPoints()
    this.emit('bonus:reset')
    return { ...this.bonusPoints }
  }

  /**
   * Завершает работу сервиса
   */
  shutdown(): void {
    saveBonusPoints(this.bonusPoints)
    log.info('Завершён')
  }
}

/**
 * Получает экземпляр BonusService
 */
export function getBonusService(): BonusService {
  return BonusService.getInstance()
}
