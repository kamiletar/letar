/**
 * Barrel file для экспорта Server Actions работы с отзывами
 *
 * ВАЖНО: Этот файл НЕ должен иметь 'use server' директиву,
 * так как он только реэкспортирует функции из других файлов,
 * которые уже имеют свои 'use server' директивы.
 *
 * @module review
 *
 * Структура модуля:
 * - review.types.ts — типы данных
 * - review-queries.action.ts — получение отзывов + проверки canReview*
 * - review-mutations.action.ts — создание, ответ, жалоба
 * - review-utils.ts — пересчёт рейтингов
 *
 * @example
 * ```ts
 * import {
 *   createReviewAction,
 *   getMyReviewsAction,
 *   canReviewSchoolAction,
 *   type ReviewWithAuthor,
 * } from '../_actions/review.action'
 * ```
 */

// === Типы ===
export type {
  CanReviewResult,
  CanReviewSchoolResult,
  GetReviewsResult,
  GetSchoolsForReviewResult,
  ReviewActionResult,
  ReviewWithAuthor,
  SchoolForReview,
} from './review.types'

// === Queries (получение данных + проверки) ===
export {
  canReviewLessonAction,
  canReviewSchoolAction,
  getInstructorReviewsAction,
  getMyReviewsAction,
  getSchoolReviewsAction,
  getSchoolsForReviewAction,
} from './review-queries.action'

// === Mutations (изменение данных) ===
export { createReviewAction, reportReviewAction, respondToReviewAction } from './review-mutations.action'

// === Utils (вспомогательные функции) ===
export { updateInstructorRating, updateSchoolRating } from './review-utils'
