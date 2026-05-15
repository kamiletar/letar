'use server'

/**
 * Server Actions для экзаменов ГИБДД по практике
 */

import type { ExamResult } from '@letar/driving-school-db/prisma'
import type { Decimal } from 'decimal.js'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import {
  type ExamRegistrationWithSession,
  findGibddTheoryPassedDate,
  getTheoryValidityStatus,
} from '@/lib/student-progress'

import {
  CheckGibddPracticeReadinessSchema,
  RecordGibddPracticeResultSchema,
  ScheduleGibddPracticeExamSchema,
} from '../_schemas/gibdd.schema'

import type { CheckGibddReadinessResult, RecordGibddResultResult, ScheduleGibddExamResult } from './gibdd.types'

// === Данные для записи на экзамен ===

export interface ScheduleGibddPracticeExamData {
  categoryProgressId: string
  sessionId: string
  escortRequired?: boolean
  escortAmount?: number
  note?: string
}

export interface RecordGibddPracticeResultData {
  registrationId: string
  result: ExamResult
  escortRequired?: boolean
  escortPaid?: boolean
  escortAmount?: number
  notes?: string
}

// === Проверка готовности к экзамену ГИБДД по практике ===

export async function checkGibddPracticeReadinessAction(
  categoryProgressId: string
): Promise<CheckGibddReadinessResult> {
  // Валидация входных данных
  const parsed = CheckGibddPracticeReadinessSchema.safeParse({ categoryProgressId })
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const categoryProgress = await db.categoryProgress.findUnique({
        where: { id: categoryProgressId },
        include: {
          progress: {
            select: { id: true, organizationId: true, userId: true },
          },
        },
      })

      if (!categoryProgress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(categoryProgress.progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

      // Проверяем допуск инструктора
      if (categoryProgress.instructorApprovalStatus !== 'APPROVED') {
        return {
          success: true,
          info: {
            canSchedule: false,
            reason: 'Нет допуска от инструктора',
          },
        }
      }

      // Проверяем, сдана ли теория ГИБДД
      const theoryAttempts = await schoolDb.examAttempt.findMany({
        where: {
          userId: categoryProgress.progress.userId,
          registration: {
            studentProgressId: categoryProgress.progress.id,
          },
          session: { type: 'GIBDD_THEORY' },
        },
        include: {
          session: { select: { type: true } },
        },
        orderBy: { createdAt: 'asc' },
      })

      const theoryRegWithSession: ExamRegistrationWithSession[] = theoryAttempts.map((a) => ({
        session: { type: a.session.type },
        attempt: {
          result: a.result,
          gradedAt: a.gradedAt,
          createdAt: a.createdAt,
        },
      }))

      const theoryPassedAt = findGibddTheoryPassedDate(theoryRegWithSession)

      if (!theoryPassedAt) {
        return {
          success: true,
          info: {
            canSchedule: false,
            reason: 'Теория ГИБДД не сдана',
          },
        }
      }

      // Проверяем срок действия теории
      const theoryValidity = getTheoryValidityStatus(theoryPassedAt)
      if (!theoryValidity.isValid) {
        return {
          success: true,
          info: {
            canSchedule: false,
            reason: 'Срок действия теории ГИБДД истёк',
            theoryExpiresAt: theoryValidity.expiresAt ?? undefined,
          },
        }
      }

      // Получаем попытки практики ГИБДД
      const practiceAttempts = await schoolDb.examAttempt.findMany({
        where: {
          userId: categoryProgress.progress.userId,
          registration: {
            categoryProgressId,
          },
          session: {
            type: { in: ['GIBDD_PRACTICE_AREA', 'GIBDD_PRACTICE_CITY'] },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      // Проверяем, не сдана ли уже практика
      const passedPractice = practiceAttempts.some((a) => a.result === 'PASSED')

      if (passedPractice) {
        return {
          success: true,
          info: {
            canSchedule: false,
            reason: 'Практика ГИБДД уже сдана',
          },
        }
      }

      // Проверяем cooldown для практики (3 попытки, потом 6 месяцев)
      const failedAttempts = practiceAttempts.filter((a) => a.result === 'FAILED' || a.result === 'NO_SHOW')

      if (failedAttempts.length >= 3) {
        const lastFailed = failedAttempts[failedAttempts.length - 1]
        const lastFailedDate = lastFailed.gradedAt ?? lastFailed.createdAt
        const cooldownEnd = new Date(lastFailedDate)
        cooldownEnd.setMonth(cooldownEnd.getMonth() + 6)

        if (new Date() < cooldownEnd) {
          return {
            success: true,
            info: {
              canSchedule: false,
              reason: `Период ожидания до ${cooldownEnd.toLocaleDateString()}`,
              nextAvailableDate: cooldownEnd,
              practiceAttempts: failedAttempts.length,
              isInCooldown: true,
            },
          }
        }
      }

      return {
        success: true,
        info: {
          canSchedule: true,
          theoryExpiresAt: theoryValidity.expiresAt ?? undefined,
          remainingDaysTheory: theoryValidity.daysUntilExpiry ?? undefined,
          practiceAttempts: failedAttempts.length,
        },
      }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка проверки готовности к практике ГИБДД:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Запись на экзамен ГИБДД по практике ===

export async function scheduleGibddPracticeExamAction(
  data: ScheduleGibddPracticeExamData
): Promise<ScheduleGibddExamResult> {
  // Валидация входных данных
  const parsed = ScheduleGibddPracticeExamSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR', message: 'Некорректные данные' }
  }

  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const categoryProgress = await db.categoryProgress.findUnique({
        where: { id: data.categoryProgressId },
        include: {
          progress: {
            select: { id: true, organizationId: true, userId: true },
          },
        },
      })

      if (!categoryProgress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(categoryProgress.progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      if (categoryProgress.instructorApprovalStatus !== 'APPROVED') {
        return { success: false, error: 'NOT_APPROVED', message: 'Нет допуска от инструктора' }
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

      if (session.type !== 'GIBDD_PRACTICE_AREA' && session.type !== 'GIBDD_PRACTICE_CITY') {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Это не сессия экзамена ГИБДД по практике' }
      }

      // Создаём регистрацию
      const registration = await schoolDb.examRegistration.create({
        data: {
          sessionId: data.sessionId,
          userId: categoryProgress.progress.userId,
          studentProgressId: categoryProgress.progress.id,
          categoryProgressId: data.categoryProgressId,
        },
      })

      return { success: true, registrationId: registration.id }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка записи на практику ГИБДД:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Запись результата экзамена ГИБДД по практике ===

export async function recordGibddPracticeResultAction(
  data: RecordGibddPracticeResultData
): Promise<RecordGibddResultResult> {
  // Валидация входных данных
  const parsed = RecordGibddPracticeResultSchema.safeParse(data)
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
          categoryProgress: { select: { id: true } },
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

      if (registration.session.type !== 'GIBDD_PRACTICE_AREA' && registration.session.type !== 'GIBDD_PRACTICE_CITY') {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Это не экзамен ГИБДД по практике' }
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
          escortRequired: data.escortRequired ?? false,
          escortPaid: data.escortPaid ?? false,
          // Cast для совместимости типов Decimal между ZenStack и Prisma
          escortAmount: (data.escortAmount ?? null) as unknown as Decimal | null,
        },
      })

      return { success: true, attemptId: attempt.id }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка записи результата ГИБДД практики:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
