/**
 * Утилиты подсчёта баллов для live scoring
 *
 * Алгоритм: 5 судей ставят оценки 1-5, отбрасываются макс и мин, сумма 3 средних.
 * Максимум за одно измерение: 15. Максимум за выступление: 30.
 *
 * @module scoring
 */

/** Количество судей в жюри */
export const JUDGES_COUNT = 5

/** Минимальная оценка судьи */
export const MIN_SCORE = 1

/** Максимальная оценка судьи */
export const MAX_SCORE = 5

/** Максимум баллов за измерение (после отброса макс/мин) */
export const MAX_DIMENSION_SCORE = 15

/** Максимум баллов за выступление (текст + подача) */
export const MAX_PERFORMANCE_SCORE = 30

/**
 * Подсчёт скорректированных баллов: отбросить макс и мин, суммировать 3 средних.
 *
 * @param scores - массив из 5 оценок (1-5 каждая)
 * @returns сумма 3 средних оценок (3-15), или null если массив неполный
 */
export function calculateAdjusted(scores: number[]): number | null {
  if (scores.length !== JUDGES_COUNT) {
    return null
  }

  const sorted = [...scores].sort((a, b) => a - b)
  // Отбрасываем мин (index 0) и макс (index 4), суммируем средние
  return sorted[1] + sorted[2] + sorted[3]
}

/**
 * Подсчёт итогового балла за выступление
 */
export function calculateTotal(textAdjusted: number | null, deliveryAdjusted: number | null): number | null {
  if (textAdjusted === null || deliveryAdjusted === null) {
    return null
  }
  return textAdjusted + deliveryAdjusted
}

/**
 * Проверка валидности оценки судьи
 */
export function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= MIN_SCORE && score <= MAX_SCORE
}

/**
 * Определить MVP матча — поэта с максимальным totalScore
 *
 * @returns лучший поэт или null если нет перформансов
 */
export function findMatchMVP<T extends { totalScore: number | null }>(performances: T[]): T | null {
  let best: T | null = null
  let bestScore = -1

  for (const p of performances) {
    if (p.totalScore !== null && p.totalScore > bestScore) {
      bestScore = p.totalScore
      best = p
    }
  }

  return best
}
