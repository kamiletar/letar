'use server'

import type { ApprovalStatus, ExamResult, PracticeStatus } from '@letar/driving-school-db/prisma'

import { withAuth, withSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'

// === Типы для практики ===

export interface InternalPracticeAttemptSummary {
  id: string
  sessionId: string
  sessionDate: Date
  result: ExamResult
  score: number | null
  gradedAt: Date | null
  gradedBy: { id: string; name: string | null } | null
}

export interface ApprovalRequestSummary {
  id: string
  category: string
  studentName: string
  studentId: string
  lessonsCompleted: number
  requestedAt: Date
  status: ApprovalStatus
  note: string | null
}

// === Результаты операций ===

export type PracticeActionResult = { success: true } | { success: false; error: ActionErrorCode; message?: string }

export type RecordAttemptResult =
  | { success: true; attemptId: string }
  | { success: false; error: ActionErrorCode; message?: string }

export type GetAttemptsResult =
  | { success: true; attempts: InternalPracticeAttemptSummary[] }
  | { success: false; error: ActionErrorCode }

export type GetApprovalRequestsResult =
  | { success: true; requests: ApprovalRequestSummary[] }
  | { success: false; error: ActionErrorCode }

// === Обновление статуса практики ===

export interface UpdatePracticeStatusData {
  categoryProgressId: string
  status: PracticeStatus
  lessonsCompleted?: number
}

export async function updatePracticeStatusAction(data: UpdatePracticeStatusData): Promise<PracticeActionResult> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      const categoryProgress = await db.categoryProgress.findUnique({
        where: { id: data.categoryProgressId },
        include: {
          progress: {
            select: { organizationId: true },
          },
        },
      })

      if (!categoryProgress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      return withSchoolManager(categoryProgress.progress.organizationId, async (managerUser) => {
        const managerDb = getEnhancedPrisma(managerUser)
        const updateData: {
          practiceStatus: PracticeStatus
          practiceStartedAt?: Date
          practiceCompletedAt?: Date | null
          lessonsCompleted?: number
        } = {
          practiceStatus: data.status,
        }

        if (data.status === 'IN_PROGRESS' && categoryProgress.practiceStatus === 'NOT_STARTED') {
          updateData.practiceStartedAt = new Date()
        }

        if (data.status === 'COMPLETED') {
          updateData.practiceCompletedAt = new Date()
        } else {
          updateData.practiceCompletedAt = null
        }

        if (data.lessonsCompleted !== undefined) {
          updateData.lessonsCompleted = data.lessonsCompleted
        }

        await managerDb.categoryProgress.update({
          where: { id: data.categoryProgressId },
          data: updateData,
        })

        return { success: true }
      })
    } catch (error) {
      console.error('Ошибка обновления статуса практики:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Запись результата внутреннего экзамена по практике ===

export interface RecordInternalPracticeAttemptData {
  categoryProgressId: string
  sessionId: string
  result: ExamResult
  score?: number
  notes?: string
}

export async function recordInternalPracticeAttemptAction(
  data: RecordInternalPracticeAttemptData
): Promise<RecordAttemptResult> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)
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

      return withSchoolManager(categoryProgress.progress.organizationId, async (managerUser) => {
        const managerDb = getEnhancedPrisma(managerUser)
        // Проверяем сессию
        const session = await managerDb.examSession.findUnique({
          where: { id: data.sessionId },
          select: { id: true, type: true, organizationId: true },
        })

        if (!session) {
          return { success: false, error: 'SESSION_NOT_FOUND', message: 'Сессия экзамена не найдена' }
        }

        if (session.type !== 'INTERNAL_PRACTICE') {
          return {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Это не сессия внутреннего экзамена по практике',
          }
        }

        // Проверяем/создаём регистрацию
        let registration = await managerDb.examRegistration.findFirst({
          where: {
            sessionId: data.sessionId,
            userId: categoryProgress.progress.userId,
          },
        })

        if (!registration) {
          registration = await managerDb.examRegistration.create({
            data: {
              sessionId: data.sessionId,
              userId: categoryProgress.progress.userId,
              studentProgressId: categoryProgress.progress.id,
              categoryProgressId: data.categoryProgressId,
            },
          })
        }

        const attempt = await managerDb.examAttempt.create({
          data: {
            sessionId: data.sessionId,
            registrationId: registration.id,
            userId: categoryProgress.progress.userId,
            result: data.result,
            score: data.score ?? null,
            notes: data.notes ?? null,
            gradedAt: new Date(),
            gradedById: managerUser.id,
          },
        })

        return { success: true, attemptId: attempt.id }
      })
    } catch (error) {
      console.error('Ошибка записи результата практики:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Получение попыток внутреннего экзамена по практике ===

export async function getInternalPracticeAttemptsAction(categoryProgressId: string): Promise<GetAttemptsResult> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      const categoryProgress = await db.categoryProgress.findUnique({
        where: { id: categoryProgressId },
        include: {
          progress: {
            select: { organizationId: true, userId: true },
          },
        },
      })

      if (!categoryProgress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      return withSchoolManager(categoryProgress.progress.organizationId, async (managerUser) => {
        const managerDb = getEnhancedPrisma(managerUser)
        // Получаем попытки напрямую через ExamAttempt
        const attemptRecords = await managerDb.examAttempt.findMany({
          where: {
            userId: categoryProgress.progress.userId,
            session: {
              type: 'INTERNAL_PRACTICE',
            },
            registration: {
              categoryProgressId,
            },
          },
          include: {
            session: {
              select: { id: true, scheduledAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        // Получаем информацию о graders
        const graderIds = [...new Set(attemptRecords.map((a) => a.gradedById).filter(Boolean))] as string[]
        const graders = await managerDb.user.findMany({
          where: { id: { in: graderIds } },
          select: { id: true, name: true },
        })
        const graderMap = new Map(graders.map((g) => [g.id, g]))

        const attempts: InternalPracticeAttemptSummary[] = attemptRecords.map((attempt) => ({
          id: attempt.id,
          sessionId: attempt.session.id,
          sessionDate: attempt.session.scheduledAt,
          result: attempt.result,
          score: attempt.score,
          gradedAt: attempt.gradedAt,
          gradedBy: attempt.gradedById ? (graderMap.get(attempt.gradedById) ?? null) : null,
        }))

        return { success: true, attempts }
      })
    } catch (error) {
      console.error('Ошибка получения попыток практики:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Запрос допуска к ГИБДД ===

export async function requestInstructorApprovalAction(categoryProgressId: string): Promise<PracticeActionResult> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      const categoryProgress = await db.categoryProgress.findUnique({
        where: { id: categoryProgressId },
        include: {
          progress: {
            select: { organizationId: true },
          },
        },
      })

      if (!categoryProgress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      return withSchoolManager(categoryProgress.progress.organizationId, async (managerUser) => {
        const managerDb = getEnhancedPrisma(managerUser)
        if (categoryProgress.instructorApprovalStatus === 'REQUESTED') {
          return { success: false, error: 'ALREADY_REQUESTED', message: 'Запрос уже отправлен' }
        }

        if (categoryProgress.instructorApprovalStatus === 'APPROVED') {
          return { success: false, error: 'ALREADY_APPROVED', message: 'Допуск уже получен' }
        }

        if (!categoryProgress.instructorId) {
          return { success: false, error: 'VALIDATION_ERROR', message: 'Не назначен инструктор' }
        }

        await managerDb.categoryProgress.update({
          where: { id: categoryProgressId },
          data: {
            instructorApprovalStatus: 'REQUESTED',
          },
        })

        return { success: true }
      })
    } catch (error) {
      console.error('Ошибка запроса допуска:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Одобрение допуска (инструктор) ===

export interface ApproveGibddExamData {
  categoryProgressId: string
  note?: string
}

export async function approveForGibddExamAction(data: ApproveGibddExamData): Promise<PracticeActionResult> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      const categoryProgress = await db.categoryProgress.findUnique({
        where: { id: data.categoryProgressId },
        include: {
          instructor: {
            select: { userId: true },
          },
          progress: {
            select: { organizationId: true },
          },
        },
      })

      if (!categoryProgress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      // Проверяем, что это инструктор ученика или менеджер
      const isInstructor = categoryProgress.instructor?.userId === user.id

      if (!isInstructor) {
        // Проверяем права менеджера
        const managerAuthResult = await withSchoolManager(categoryProgress.progress.organizationId, async () => ({
          success: true,
        }))
        if (!managerAuthResult.success) {
          return { success: false, error: 'NOT_YOUR_STUDENT', message: 'Вы не являетесь инструктором этого ученика' }
        }
      }

      if (categoryProgress.instructorApprovalStatus === 'APPROVED') {
        return { success: false, error: 'ALREADY_APPROVED', message: 'Допуск уже выдан' }
      }

      await db.categoryProgress.update({
        where: { id: data.categoryProgressId },
        data: {
          instructorApprovalStatus: 'APPROVED',
          instructorApprovedAt: new Date(),
          instructorApprovalNote: data.note ?? null,
        },
      })

      return { success: true }
    } catch (error) {
      console.error('Ошибка одобрения допуска:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Отказ в допуске (инструктор) ===

export interface DenyGibddExamApprovalData {
  categoryProgressId: string
  note: string
}

export async function denyGibddExamApprovalAction(data: DenyGibddExamApprovalData): Promise<PracticeActionResult> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      const categoryProgress = await db.categoryProgress.findUnique({
        where: { id: data.categoryProgressId },
        include: {
          instructor: {
            select: { userId: true },
          },
          progress: {
            select: { organizationId: true },
          },
        },
      })

      if (!categoryProgress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      // Проверяем права
      const isInstructor = categoryProgress.instructor?.userId === user.id

      if (!isInstructor) {
        const managerAuthResult = await withSchoolManager(categoryProgress.progress.organizationId, async () => ({
          success: true,
        }))
        if (!managerAuthResult.success) {
          return { success: false, error: 'NOT_YOUR_STUDENT', message: 'Вы не являетесь инструктором этого ученика' }
        }
      }

      if (!data.note || data.note.trim().length === 0) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Укажите причину отказа' }
      }

      await db.categoryProgress.update({
        where: { id: data.categoryProgressId },
        data: {
          instructorApprovalStatus: 'DENIED',
          instructorApprovalNote: data.note.trim(),
        },
      })

      return { success: true }
    } catch (error) {
      console.error('Ошибка отказа в допуске:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Получение запросов на допуск (для инструктора) ===

export async function getApprovalRequestsAction(): Promise<GetApprovalRequestsResult> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)
      // Получаем профиль инструктора
      const instructorProfile = await db.instructorProfile.findUnique({
        where: { userId: user.id },
      })

      if (!instructorProfile) {
        return { success: false, error: 'NOT_INSTRUCTOR' }
      }

      const categoryProgresses = await db.categoryProgress.findMany({
        where: {
          instructorId: instructorProfile.id,
          instructorApprovalStatus: 'REQUESTED',
        },
        include: {
          progress: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })

      const requests: ApprovalRequestSummary[] = categoryProgresses.map((cp) => ({
        id: cp.id,
        category: cp.category,
        studentName: cp.progress.user.name || 'Без имени',
        studentId: cp.progress.userId,
        lessonsCompleted: cp.lessonsCompleted,
        requestedAt: cp.updatedAt,
        status: cp.instructorApprovalStatus,
        note: cp.instructorApprovalNote,
      }))

      return { success: true, requests }
    } catch (error) {
      console.error('Ошибка получения запросов на допуск:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}
