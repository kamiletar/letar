/**
 * Bonus Store — JSON хранилище бонусных очков
 */

import { app } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { BonusPoints, BonusTransaction } from '../../../shared/types/bonus-points'
import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('BonusStore')

const BONUS_FILE = 'bonus-points.json'
const MAX_TRANSACTIONS = 1000 // Максимум транзакций для хранения

/** In-memory кэш — читаем файл один раз */
let cache: BonusPoints | null = null

/**
 * Создаёт начальные данные бонусов
 */
function createInitialBonusPoints(): BonusPoints {
  return {
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    transactions: [],
  }
}

/**
 * Получает путь к файлу бонусов
 */
function getBonusFilePath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, BONUS_FILE)
}

/**
 * Загружает бонусы (из кэша или файла)
 */
export async function loadBonusPoints(): Promise<BonusPoints> {
  if (cache) {
    return cache
  }

  const filePath = getBonusFilePath()

  try {
    const data = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(data) as BonusPoints

    // Валидация данных
    if (
      typeof parsed.balance !== 'number'
      || typeof parsed.totalEarned !== 'number'
      || typeof parsed.totalSpent !== 'number'
      || !Array.isArray(parsed.transactions)
    ) {
      log.warn('Неверный формат данных, создаём новые')
      cache = createInitialBonusPoints()
      return cache
    }

    cache = parsed
    return cache
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.error('Ошибка загрузки бонусов', { error })
    }
  }

  cache = createInitialBonusPoints()
  return cache
}

/**
 * Сохраняет бонусы в файл (async, обновляет кэш)
 */
export async function saveBonusPoints(bonusPoints: BonusPoints): Promise<void> {
  const filePath = getBonusFilePath()

  try {
    // Ограничиваем количество транзакций
    const limitedBonusPoints: BonusPoints = {
      ...bonusPoints,
      transactions: bonusPoints.transactions.slice(-MAX_TRANSACTIONS),
    }

    cache = limitedBonusPoints
    await writeFile(filePath, JSON.stringify(limitedBonusPoints, null, 2), 'utf-8')
  } catch (error) {
    log.error('Ошибка сохранения бонусов', { error })
  }
}

/**
 * Добавляет транзакцию
 */
export function addTransaction(bonusPoints: BonusPoints, transaction: BonusTransaction): BonusPoints {
  const newTransactions = [...bonusPoints.transactions, transaction]

  // Обновляем балансы
  let newBalance = bonusPoints.balance
  let newTotalEarned = bonusPoints.totalEarned
  let newTotalSpent = bonusPoints.totalSpent

  if (transaction.amount > 0) {
    newBalance += transaction.amount
    newTotalEarned += transaction.amount
  } else {
    newBalance += transaction.amount // отрицательное число
    newTotalSpent += Math.abs(transaction.amount)
  }

  return {
    balance: newBalance,
    totalEarned: newTotalEarned,
    totalSpent: newTotalSpent,
    transactions: newTransactions.slice(-MAX_TRANSACTIONS),
  }
}

/**
 * Получает транзакции за период
 */
export function getTransactionsByPeriod(bonusPoints: BonusPoints, startDate: Date, endDate: Date): BonusTransaction[] {
  return bonusPoints.transactions.filter((t) => {
    const date = new Date(t.createdAt)
    return date >= startDate && date <= endDate
  })
}

/**
 * Сбрасывает бонусы (для тестов)
 */
export function resetBonusPoints(): BonusPoints {
  const initial = createInitialBonusPoints()
  saveBonusPoints(initial)
  return initial
}
