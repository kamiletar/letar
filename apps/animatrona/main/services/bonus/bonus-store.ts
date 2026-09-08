/**
 * Bonus Store — JSON хранилище бонусных очков
 */

import { createJsonStore } from '@letar/electron-storage'

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

// mergeDefaults не используется — валидация формы (isValidBonusPoints) собственная,
// на разбор чисел/массива createJsonStore не влияет
const bonusStore = createJsonStore<BonusPoints>(BONUS_FILE, createInitialBonusPoints(), { logger: log })

/**
 * Проверяет, что загруженный объект соответствует форме BonusPoints —
 * createJsonStore разбирает JSON, но не проверяет форму результата
 */
function isValidBonusPoints(value: BonusPoints): boolean {
  return (
    typeof value.balance === 'number'
    && typeof value.totalEarned === 'number'
    && typeof value.totalSpent === 'number'
    && Array.isArray(value.transactions)
  )
}

/**
 * Загружает бонусы (из кэша или файла)
 */
export async function loadBonusPoints(): Promise<BonusPoints> {
  if (cache) {
    return cache
  }

  const loaded = await bonusStore.load()

  if (!isValidBonusPoints(loaded)) {
    log.warn('Неверный формат данных, создаём новые')
    cache = createInitialBonusPoints()
    return cache
  }

  // Копия: без mergeDefaults createJsonStore отдаёт на фолбэке (нет файла) ту же
  // ссылку на дефолт, а не свежий объект — как раньше делал createInitialBonusPoints().
  // Мутация снаружи испортила бы дефолт на весь процесс.
  cache = { ...loaded, transactions: [...loaded.transactions] }
  return cache
}

/**
 * Сохраняет бонусы в файл (async, обновляет кэш)
 */
export async function saveBonusPoints(bonusPoints: BonusPoints): Promise<void> {
  // Ограничиваем количество транзакций
  const limitedBonusPoints: BonusPoints = {
    ...bonusPoints,
    transactions: bonusPoints.transactions.slice(-MAX_TRANSACTIONS),
  }

  cache = limitedBonusPoints

  try {
    await bonusStore.save(limitedBonusPoints)
  } catch {
    // Ошибка уже залогирована store'ом — сохраняем оригинальное поведение:
    // saveBonusPoints не пробрасывает исключение дальше
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
