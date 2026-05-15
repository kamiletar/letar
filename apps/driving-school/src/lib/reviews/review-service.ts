/**
 * Бизнес-логика для работы с отзывами.
 *
 * Содержит функции для:
 * - Расчёта статистики инструктора с breakdown по качественным аспектам
 * - Модерации отзывов (скрытие/публикация)
 * - Вычисления агрегированных метрик
 */

import type { getEnhancedPrisma } from '@/lib/db'

// === Типы ===

/**
 * Статистика инструктора на основе отзывов.
 */
export interface InstructorStats {
  /** Средний рейтинг (1-5) */
  averageRating: number | null
  /** Количество отзывов */
  reviewCount: number
  /** Процент "Инструктор приехал вовремя" */
  wasOnTimePercent: number | null
  /** Процент "Инструктор был терпелив" */
  wasPatientPercent: number | null
  /** Процент "Понятно объяснял" */
  explainedWellPercent: number | null
  /** Процент "Чувствовал себя в безопасности" */
  feltSafePercent: number | null
  /** Средняя оценка автомобиля (1-5) */
  averageVehicleRating: number | null
  /** Процент "Рекомендовал бы инструктора" */
  wouldRecommendPercent: number | null
}

/**
 * Отзыв с качественными аспектами для расчёта статистики.
 */
export interface ReviewForStats {
  rating: number
  wasOnTime: boolean | null
  wasPatient: boolean | null
  explainedWell: boolean | null
  feltSafe: boolean | null
  vehicleRating: number | null
  wouldRecommend: boolean | null
}

// === Функции ===

/**
 * Вычислить статистику инструктора на основе отзывов.
 *
 * @param reviews - Массив отзывов инструктора
 * @returns Статистика с breakdown по качественным аспектам
 *
 * @example
 * ```ts
 * const reviews = await db.review.findMany({
 *   where: { instructorId, status: 'PUBLISHED' },
 *   select: {
 *     rating: true,
 *     wasOnTime: true,
 *     wasPatient: true,
 *     explainedWell: true,
 *     feltSafe: true,
 *     vehicleRating: true,
 *     wouldRecommend: true,
 *   }
 * })
 *
 * const stats = calculateInstructorStats(reviews)
 * ```
 */
export function calculateInstructorStats(reviews: ReviewForStats[]): InstructorStats {
  if (reviews.length === 0) {
    return {
      averageRating: null,
      reviewCount: 0,
      wasOnTimePercent: null,
      wasPatientPercent: null,
      explainedWellPercent: null,
      feltSafePercent: null,
      averageVehicleRating: null,
      wouldRecommendPercent: null,
    }
  }

  // Средний рейтинг
  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
  const averageRating = Math.round((totalRating / reviews.length) * 10) / 10

  // Процент положительных ответов для булевых аспектов
  const calculatePercent = (
    field: keyof Pick<ReviewForStats, 'wasOnTime' | 'wasPatient' | 'explainedWell' | 'feltSafe' | 'wouldRecommend'>
  ) => {
    const answered = reviews.filter((r) => r[field] !== null)
    if (answered.length === 0) {
      return null
    }
    const positive = answered.filter((r) => r[field] === true).length
    return Math.round((positive / answered.length) * 100)
  }

  // Средняя оценка автомобиля
  const vehicleRatings = reviews.map((r) => r.vehicleRating).filter((r): r is number => r !== null)
  const averageVehicleRating =
    vehicleRatings.length > 0
      ? Math.round((vehicleRatings.reduce((sum, r) => sum + r, 0) / vehicleRatings.length) * 10) / 10
      : null

  return {
    averageRating,
    reviewCount: reviews.length,
    wasOnTimePercent: calculatePercent('wasOnTime'),
    wasPatientPercent: calculatePercent('wasPatient'),
    explainedWellPercent: calculatePercent('explainedWell'),
    feltSafePercent: calculatePercent('feltSafe'),
    averageVehicleRating,
    wouldRecommendPercent: calculatePercent('wouldRecommend'),
  }
}

/**
 * Скрыть отзыв (модерация).
 *
 * @param db - Enhanced Prisma клиент
 * @param reviewId - ID отзыва
 * @param hiddenById - ID пользователя, скрывающего отзыв
 * @param hiddenReason - Причина скрытия
 *
 * @example
 * ```ts
 * await hideReview(db, 'review-123', 'moderator-456', 'Нарушение правил')
 * ```
 */
export async function hideReview(
  db: ReturnType<typeof getEnhancedPrisma>,
  reviewId: string,
  hiddenById: string,
  hiddenReason?: string
): Promise<void> {
  await db.review.update({
    where: { id: reviewId },
    data: {
      status: 'HIDDEN',
      hiddenAt: new Date(),
      hiddenById,
      hiddenReason,
    },
  })
}

/**
 * Опубликовать отзыв (отменить модерацию).
 *
 * @param db - Enhanced Prisma клиент
 * @param reviewId - ID отзыва
 *
 * @example
 * ```ts
 * await publishReview(db, 'review-123')
 * ```
 */
export async function publishReview(db: ReturnType<typeof getEnhancedPrisma>, reviewId: string): Promise<void> {
  await db.review.update({
    where: { id: reviewId },
    data: {
      status: 'PUBLISHED',
      hiddenAt: null,
      hiddenById: null,
      hiddenReason: null,
    },
  })
}
