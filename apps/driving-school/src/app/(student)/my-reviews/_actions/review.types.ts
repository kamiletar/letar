/**
 * Типы для работы с отзывами
 */

/**
 * Отзыв с информацией об авторе
 */
export interface ReviewWithAuthor {
  id: string
  authorId: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
  targetType: 'INSTRUCTOR' | 'SCHOOL'
  instructorId: string | null
  organizationId: string | null
  lessonId: string | null
  rating: number
  text: string | null
  status: 'PUBLISHED' | 'HIDDEN' | 'DELETED'
  response: string | null
  respondedAt: Date | null
  respondedById: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Результат получения отзывов
 */
export type GetReviewsResult = { success: true; reviews: ReviewWithAuthor[] } | { success: false; error: string }

/**
 * Результат действия с отзывом
 */
export type ReviewActionResult = { success: true } | { success: false; error: string }

/**
 * Результат проверки возможности оставить отзыв
 */
export interface CanReviewResult {
  canReview: boolean
  reason?: string
}

/**
 * Результат проверки возможности оставить отзыв на школу
 */
export interface CanReviewSchoolResult extends CanReviewResult {
  organization?: {
    id: string
    name: string
    logo: string | null
  }
}

/**
 * Школа для отзыва
 */
export interface SchoolForReview {
  id: string
  name: string
  logo: string | null
  hasReview: boolean
}

/**
 * Результат получения школ для отзыва
 */
export type GetSchoolsForReviewResult =
  | { success: true; schools: SchoolForReview[] }
  | { success: false; error: string }
