/**
 * Типы для экзаменов ГИБДД
 */

import type { ExamResult, ExamType } from '@letar/driving-school-db/prisma'

/**
 * Сводная информация о попытке экзамена ГИБДД
 */
export interface GibddExamAttemptSummary {
  id: string
  sessionId: string
  sessionDate: Date
  type: ExamType
  result: ExamResult
  gradedAt: Date | null
  escortRequired: boolean
  escortPaid: boolean
  escortAmount: number | null
  isAfterCooldown: boolean
  notes: string | null
}

/**
 * Информация о готовности к записи на экзамен
 */
export interface GibddExamScheduleInfo {
  canSchedule: boolean
  reason?: string
  nextAvailableDate?: Date
  theoryExpiresAt?: Date
  remainingDaysTheory?: number
  practiceAttempts?: number
  isInCooldown?: boolean
}

/**
 * Коды ошибок для действий с ГИБДД
 */
export type GibddActionError =
  | 'UNAUTHORIZED'
  | 'NOT_SCHOOL_ADMIN'
  | 'NOT_SCHOOL_MEMBER'
  | 'NOT_INSTRUCTOR'
  | 'NOT_OWNER'
  | 'NO_PROFILE'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'THEORY_NOT_PASSED'
  | 'THEORY_EXPIRED'
  | 'IN_COOLDOWN'
  | 'NOT_APPROVED'
  | 'ALREADY_PASSED'
  | 'UNKNOWN_ERROR'

/**
 * Результат записи на экзамен ГИБДД
 */
export type ScheduleGibddExamResult =
  | { success: true; registrationId: string }
  | { success: false; error: GibddActionError; message?: string }

/**
 * Результат записи результата экзамена ГИБДД
 */
export type RecordGibddResultResult =
  | { success: true; attemptId: string }
  | { success: false; error: GibddActionError; message?: string }

/**
 * Результат получения попыток ГИБДД
 */
export type GetGibddAttemptsResult =
  | { success: true; attempts: GibddExamAttemptSummary[] }
  | { success: false; error: GibddActionError }

/**
 * Результат проверки готовности к экзамену
 */
export type CheckGibddReadinessResult =
  | { success: true; info: GibddExamScheduleInfo }
  | { success: false; error: GibddActionError }
