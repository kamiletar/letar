/**
 * IPC handlers для бонусных очков
 */

import { getBonusService } from '../services/bonus'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрация IPC handlers для бонусных очков
 */
export function registerBonusHandlers(): void {
  const service = getBonusService()

  // Получить бонусные очки
  createHandler('bonus:get', () => service.getBonusPoints())

  // Получить баланс
  createHandler('bonus:getBalance', () => service.getBalance())

  // Получить историю транзакций
  createHandler('bonus:getTransactions', (limit?: number) => service.getTransactions(limit))

  // Потратить очки
  createHandler('bonus:spend', (amount: number, description: string, metadata?: Record<string, unknown>) =>
    service.spend(amount, description, metadata)
  )

  // Сбросить бонусы (для тестов)
  createHandler('bonus:reset', () => service.reset())

  // Подписка на события бонусов
  service.on('bonus:balanceChanged', (event) => broadcastToWindows('bonus:balanceChanged', event))
  service.on('bonus:pointsEarned', (data) => broadcastToWindows('bonus:pointsEarned', data))
  service.on('bonus:pointsSpent', (data) => broadcastToWindows('bonus:pointsSpent', data))
}
