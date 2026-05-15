/**
 * Утилиты возрастной фильтрации каталога
 *
 * Рейтинги Shikimori: g (0+), pg (детский), pg_13 (13+), r (17+), r_plus (17+ насилие), rx (18+)
 */

/** Все возрастные рейтинги Shikimori */
export const AGE_RATINGS = ['g', 'pg', 'pg_13', 'r', 'r_plus', 'rx'] as const
export type AgeRating = (typeof AGE_RATINGS)[number]

/** Конфигурация отображения рейтингов */
export const AGE_RATING_CONFIG: Record<string, { label: string; color: string }> = {
  g: { label: '0+', color: 'green' },
  pg: { label: 'PG', color: 'blue' },
  pg_13: { label: '13+', color: 'yellow' },
  r: { label: '17+', color: 'orange' },
  r_plus: { label: '17+', color: 'orange' },
  rx: { label: '18+', color: 'red' },
}

/** Вычислить полный возраст по дате рождения */
export function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

/**
 * Допустимые рейтинги по дате рождения пользователя
 *
 * - null birthDate → до 13 (безопасный дефолт)
 * - < 13 лет → g, pg
 * - 13–16 лет → g, pg, pg_13
 * - 17+ → null (без фильтра, всё разрешено)
 *
 * @returns Массив допустимых рейтингов или null (без ограничений)
 */
export function getAllowedRatings(birthDate: Date | null | undefined): string[] | null {
  if (!birthDate) {
    return ['g', 'pg', 'pg_13']
  }

  const age = calculateAge(birthDate)
  if (age < 13) {
    return ['g', 'pg']
  }
  if (age < 17) {
    return ['g', 'pg', 'pg_13']
  }
  return null // 17+ — без ограничений
}

/**
 * Возрастная группа для ключа кэша
 *
 * Группировка позволяет кэшировать каталог по возрастным категориям,
 * а не по каждому пользователю отдельно.
 */
export function getAgeGroup(birthDate: Date | null | undefined): string {
  if (!birthDate) {
    return 'default'
  }
  const age = calculateAge(birthDate)
  if (age < 13) {
    return 'child'
  }
  if (age < 17) {
    return 'teen'
  }
  return 'adult'
}
