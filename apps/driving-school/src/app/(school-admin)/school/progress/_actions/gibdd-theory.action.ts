'use server'

/**
 * Server Actions для экзаменов ГИБДД по теории
 */

import type { ExamResult } from '@letar/driving-school-db/prisma'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import {
  type ExamAttemptForValidation,
  type ExamRegistrationWithSession,
  findGibddTheoryPassedDate,
  getTheoryRetryStatus,
  getTheoryValidityStatus,
} from '@/lib/student-progress'

import {
  CheckGibddTheoryReadinessSchema,
  RecordGibddTheoryResultSchema,
  ScheduleGibddTheoryExamSchema,
} from '../_schemas/gibdd.schema'

import type { CheckGibddReadinessResult, RecordGibddResultResult, ScheduleGibddExamResult } from './gibdd.types'

// === Данные для записи на экзамен ===

export interface ScheduleGibddTheoryExamData {
  progressId: string
  sessionId: string
  note?: string
}

export interface RecordGibddTheoryResultData {
  registrationId: string
  result: ExamResult
  notes?: string
}

// === Проверка готовности к экзамену ГИБДД по теории ===

export async function checkGibddTheoryReadinessAction(progressId: string): Promise<CheckGibddReadinessResult> {
  // Валидация входных данных
  const parsed = CheckGibddTheoryReadinessSchema.safeParse({ progressId })
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const progress = await db.studentProgress.findUnique({
        where: { id: progressId },
        select: {
          id: true,
          organizationId: true,
          userId: true,
          theoryStatus: true,
          docsSubmittedToGibdd: true,
        },
      })

      if (!progress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

      // Получаем попытки ГИБДД теории через ExamAttempt
      const theoryAttempts = await schoolDb.examAttempt.findMany({
        where: {
          userId: progress.userId,
          registration: {
            studentProgressId: progressId,
          },
          session: {
            type: 'GIBDD_THEORY',
          },
        },
        include: {
          session: {
            select: { type: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      // Преобразуем к нужному формату
      const regWithSession: ExamRegistrationWithSession[] = theoryAttempts.map((a) => ({
        session: { type: a.session.type },
        attempt: {
          result: a.result,
          gradedAt: a.gradedAt,
          createdAt: a.createdAt,
        },
      }))

      // Проверяем, сдана ли уже теория
      const theoryPassedAt = findGibddTheoryPassedDate(regWithSession)
      if (theoryPassedAt) {
        const validity = getTheoryValidityStatus(theoryPassedAt)
        return {
          success: true,
          info: {
            canSchedule: false,
            reason: 'Теория ГИБДД уже сдана',
            theoryExpiresAt: validity.expiresAt ?? undefined,
            remainingDaysTheory: validity.daysUntilExpiry ?? undefined,
          },
        }
      }

      // Проверяем готовность документов
      if (!progress.docsSubmittedToGibdd) {
        return {
          success: true,
          info: {
            canSchedule: false,
            reason: 'Документы не поданы в ГИБДД',
          },
        }
      }

      // Проверяем статус пересдачи
      const allAttempts: ExamAttemptForValidation[] = theoryAttempts.map((a) => ({
        result: a.result,
        gradedAt: a.gradedAt,
        createdAt: a.createdAt,
      }))

      const retryStatus = getTheoryRetryStatus(allAttempts)

      if (!retryStatus.canRetry) {
        return {
          success: true,
          info: {
            canSchedule: false,
            reason: retryStatus.isInCooldown
              ? `Период ожидания до ${retryStatus.nextRetryDate?.toLocaleDateString()}`
              : `Следующая попытка через ${retryStatus.minDaysUntilRetry} дней`,
            nextAvailableDate: retryStatus.nextRetryDate ?? undefined,
            isInCooldown: retryStatus.isInCooldown,
          },
        }
      }

      return {
        success: true,
        info: {
          canSchedule: true,
        },
      }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка проверки готовности к теории ГИБДД:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Запись на экзамен ГИБДД по теории ===

export async function scheduleGibddTheoryExamAction(
  data: ScheduleGibddTheoryExamData
): Promise<ScheduleGibddExamResult> {
  // Валидация входных данных
  const parsed = ScheduleGibddTheoryExamSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR', message: 'Некорректные данные' }
  }

  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const progress = await db.studentProgress.findUnique({
        where: { id: data.progressId },
        select: { id: true, organizationId: true, userId: true, docsSubmittedToGibdd: true },
      })

      if (!progress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      if (!progress.docsSubmittedToGibdd) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Документы не поданы в ГИБДД' }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

      // Проверяем сессию
      const session = await schoolDb.examSession.findUnique({
        where: { id: data.sessionId },
        select: { id: true, type: true },
      })

      if (!session) {
        return { success: false, error: 'NOT_FOUND', message: 'Сессия не найдена' }
      }

      if (session.type !== 'GIBDD_THEORY') {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Это не сессия экзамена ГИБДД по теории' }
      }

      // Создаём регистрацию
      const registration = await schoolDb.examRegistration.create({
        data: {
          sessionId: data.sessionId,
          userId: progress.userId,
          studentProgressId: data.progressId,
        },
      })

      return { success: true, registrationId: registration.id }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка записи на экзамен ГИБДД:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Запись результата экзамена ГИБДД по теории ===

export async function recordGibddTheoryResultAction(
  data: RecordGibddTheoryResultData
): Promise<RecordGibddResultResult> {
  // Валидация входных данных
  const parsed = RecordGibddTheoryResultSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR', message: 'Некорректные данные' }
  }

  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const registration = await db.examRegistration.findUnique({
        where: { id: data.registrationId },
        include: {
          session: { select: { type: true } },
          studentProgress: { select: { organizationId: true } },
        },
      })

      if (!registration) {
        return { success: false, error: 'NOT_FOUND' }
      }

      if (!registration.studentProgress) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Регистрация не связана с прогрессом' }
      }

      const schoolAuthResult = await requireSchoolManager(registration.studentProgress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      if (registration.session.type !== 'GIBDD_THEORY') {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Это не экзамен ГИБДД по теории' }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      const attempt = await schoolDb.examAttempt.create({
        data: {
          sessionId: registration.sessionId,
          registrationId: data.registrationId,
          userId: registration.userId,
          result: data.result,
          notes: data.notes ?? null,
          gradedAt: new Date(),
          gradedById: schoolAuthResult.user.id,
        },
      })

      return { success: true, attemptId: attempt.id }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка записи результата ГИБДД теории:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
