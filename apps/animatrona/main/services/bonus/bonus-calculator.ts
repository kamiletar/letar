/**
 * Bonus Calculator — расчёт заработка бонусных очков
 */

import type { EarningRates } from '../../../shared/types/bonus-points'

/**
 * Базовые ставки заработка
 */
export const DEFAULT_EARNING_RATES: EarningRates = {
  baseRatePerGB: 10, // 10 очков за 1 GB раздачи

  multipliers: {
    oldContent: 1.5, // +50% за контент старше 1 года
    rareContent: 2.0, // +100% за редкий контент (<5 сидеров)
    nightSeeding: 1.2, // +20% ночью (00:00-06:00)
    weekendSeeding: 1.1, // +10% в выходные
  },
}

const GB = 1024 * 1024 * 1024

/**
 * Контекст для расчёта бонусов
 */
export interface EarningContext {
  bytesUploaded: number
  isOldContent?: boolean // Контент старше 1 года
  isRareContent?: boolean // <5 сидеров
  timestamp?: Date // Для проверки времени
}

/**
 * Результат расчёта
 */
export interface EarningResult {
  basePoints: number
  multiplier: number
  totalPoints: number
  appliedMultipliers: string[]
}

/**
 * Проверяет, ночное ли время (00:00-06:00)
 */
export function isNightTime(date: Date = new Date()): boolean {
  const hours = date.getHours()
  return hours >= 0 && hours < 6
}

/**
 * Проверяет, выходной ли день
 */
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Воскресенье или суббота
}

/**
 * Рассчитывает заработок бонусных очков
 */
export function calculateEarning(context: EarningContext, rates: EarningRates = DEFAULT_EARNING_RATES): EarningResult {
  const timestamp = context.timestamp || new Date()

  // Базовые очки: bytes / GB * baseRatePerGB
  const gigabytes = context.bytesUploaded / GB
  const basePoints = gigabytes * rates.baseRatePerGB

  // Собираем множители
  let multiplier = 1.0
  const appliedMultipliers: string[] = []

  // Старый контент (+50%)
  if (context.isOldContent) {
    multiplier *= rates.multipliers.oldContent
    appliedMultipliers.push('old_content')
  }

  // Редкий контент (+100%)
  if (context.isRareContent) {
    multiplier *= rates.multipliers.rareContent
    appliedMultipliers.push('rare_content')
  }

  // Ночное время (+20%)
  if (isNightTime(timestamp)) {
    multiplier *= rates.multipliers.nightSeeding
    appliedMultipliers.push('night_seeding')
  }

  // Выходные (+10%)
  if (isWeekend(timestamp)) {
    multiplier *= rates.multipliers.weekendSeeding
    appliedMultipliers.push('weekend_seeding')
  }

  const totalPoints = Math.round(basePoints * multiplier)

  return {
    basePoints: Math.round(basePoints),
    multiplier: Math.round(multiplier * 100) / 100,
    totalPoints,
    appliedMultipliers,
  }
}

/**
 * Рассчитывает стоимость траты очков (для покупок)
 */
export function calculateSpendCost(basePrice: number, discount = 0): number {
  const discountMultiplier = 1 - discount
  return Math.round(basePrice * discountMultiplier)
}

/**
 * Проверяет, достаточно ли очков для покупки
 */
export function canAfford(balance: number, price: number): boolean {
  return balance >= price
}

/**
 * Форматирует бонусные очки для отображения
 */
export function formatBonusPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`
  }
  return points.toString()
}
