'use server'

/**
 * Server Actions для работы с экзаменами ГИБДД
 *
 * @module gibdd
 *
 * Структура модуля:
 * - gibdd.types.ts — типы данных
 * - gibdd-theory.action.ts — экзамен по теории (check, schedule, record)
 * - gibdd-practice.action.ts — экзамен по практике (check, schedule, record)
 * - gibdd.action.ts — получение попыток + реэкспорты
 *
 * @example
 * ```ts
 * import {
 *   checkGibddTheoryReadinessAction,
 *   scheduleGibddPracticeExamAction,
 *   getGibddAttemptsAction,
 *   type GibddExamAttemptSummary,
 * } from '../_actions/gibdd.action'
 * ```
 */

import type { ExamType } from '@letar/driving-school-db/prisma'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'

import { GetGibddAttemptsSchema } from '../_schemas/gibdd.schema'

import type { GetGibddAttemptsResult, GibddExamAttemptSummary } from './gibdd.types'

// === Типы ===
export type {
  CheckGibddReadinessResult,
  GetGibddAttemptsResult,
  GibddActionError,
  GibddExamAttemptSummary,
  GibddExamScheduleInfo,
  RecordGibddResultResult,
  ScheduleGibddExamResult,
} from './gibdd.types'

// === Теория ===
export type { RecordGibddTheoryResultData, ScheduleGibddTheoryExamData } from './gibdd-theory.action'

export {
  checkGibddTheoryReadinessAction,
  recordGibddTheoryResultAction,
  scheduleGibddTheoryExamAction,
} from './gibdd-theory.action'

// === Практика ===
export type { RecordGibddPracticeResultData, ScheduleGibddPracticeExamData } from './gibdd-practice.action'

export {
  checkGibddPracticeReadinessAction,
  recordGibddPracticeResultAction,
  scheduleGibddPracticeExamAction,
} from './gibdd-practice.action'

// === Получение попыток ГИБДД ===

export async function getGibddAttemptsAction(
  progressId: string,
  type?: 'theory' | 'practice'
): Promise<GetGibddAttemptsResult> {
  // Валидация входных данных
  const parsed = GetGibddAttemptsSchema.safeParse({ progressId, type })
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const progress = await db.studentProgress.findUnique({
        where: { id: progressId },
        select: { id: true, organizationId: true, userId: true },
      })

      if (!progress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      const examTypes: ExamType[] =
        type === 'theory'
          ? ['GIBDD_THEORY']
          : type === 'practice'
            ? ['GIBDD_PRACTICE_AREA', 'GIBDD_PRACTICE_CITY']
            : ['GIBDD_THEORY', 'GIBDD_PRACTICE_AREA', 'GIBDD_PRACTICE_CITY']

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      // Получаем попытки напрямую через ExamAttempt
      const attemptRecords = await schoolDb.examAttempt.findMany({
        where: {
          userId: progress.userId,
          registration: {
            studentProgressId: progressId,
          },
          session: {
            type: { in: examTypes },
          },
        },
        include: {
          session: {
            select: { id: true, type: true, scheduledAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const attempts: GibddExamAttemptSummary[] = attemptRecords.map((attempt) => ({
        id: attempt.id,
        sessionId: attempt.session.id,
        sessionDate: attempt.session.scheduledAt,
        type: attempt.session.type,
        result: attempt.result,
        gradedAt: attempt.gradedAt,
        escortRequired: attempt.escortRequired,
        escortPaid: attempt.escortPaid,
        escortAmount: attempt.escortAmount ? Number(attempt.escortAmount) : null,
        isAfterCooldown: attempt.isAfterCooldown,
        notes: attempt.notes,
      }))

      return { success: true, attempts }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка получения попыток ГИБДД:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
