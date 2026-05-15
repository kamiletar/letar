'use server'

import type { ExamResult, TheoryStatus } from '@letar/driving-school-db/prisma'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'

// === Типы для теории ===

export interface InternalTheoryAttemptSummary {
  id: string
  sessionId: string
  sessionDate: Date
  result: ExamResult
  score: number | null
  gradedAt: Date | null
  gradedBy: { id: string; name: string | null } | null
}

// === Результаты операций ===

export type TheoryActionResult = { success: true } | { success: false; error: ActionErrorCode; message?: string }

export type RecordAttemptResult =
  | { success: true; attemptId: string }
  | { success: false; error: ActionErrorCode; message?: string }

export type GetAttemptsResult =
  | { success: true; attempts: InternalTheoryAttemptSummary[] }
  | { success: false; error: ActionErrorCode }

// === Обновление статуса теории ===

export interface UpdateTheoryStatusData {
  progressId: string
  status: TheoryStatus
  attendanceRate?: number
}

export async function updateTheoryStatusAction(data: UpdateTheoryStatusData): Promise<TheoryActionResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: { id: data.progressId },
      select: { id: true, organizationId: true, theoryStatus: true },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    const updateData: {
      theoryStatus: TheoryStatus
      theoryStartedAt?: Date
      theoryCompletedAt?: Date | null
      theoryAttendanceRate?: number
    } = {
      theoryStatus: data.status,
    }

    // Устанавливаем даты в зависимости от статуса
    if (data.status === 'IN_PROGRESS' && progress.theoryStatus === 'NOT_STARTED') {
      updateData.theoryStartedAt = new Date()
    }

    if (data.status === 'COMPLETED') {
      updateData.theoryCompletedAt = new Date()
    } else {
      updateData.theoryCompletedAt = null
    }

    if (data.attendanceRate !== undefined) {
      updateData.theoryAttendanceRate = data.attendanceRate
    }

    await schoolDb.studentProgress.update({
      where: { id: data.progressId },
      data: updateData,
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка обновления статуса теории:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Запись результата внутреннего экзамена по теории ===

export interface RecordInternalTheoryAttemptData {
  progressId: string
  sessionId: string
  result: ExamResult
  score?: number
  notes?: string
}

export async function recordInternalTheoryAttemptAction(
  data: RecordInternalTheoryAttemptData
): Promise<RecordAttemptResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: { id: data.progressId },
      select: { id: true, organizationId: true, userId: true },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Проверяем, что сессия существует и это внутренний экзамен по теории
    const session = await schoolDb.examSession.findUnique({
      where: { id: data.sessionId },
      select: { id: true, type: true, organizationId: true },
    })

    if (!session) {
      return { success: false, error: 'SESSION_NOT_FOUND', message: 'Сессия экзамена не найдена' }
    }

    if (session.type !== 'INTERNAL_THEORY') {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Это не сессия внутреннего экзамена по теории' }
    }

    if (session.organizationId !== progress.organizationId) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Сессия принадлежит другой школе' }
    }

    // Проверяем, есть ли уже регистрация
    let registration = await schoolDb.examRegistration.findFirst({
      where: {
        sessionId: data.sessionId,
        userId: progress.userId,
      },
    })

    if (!registration) {
      // Создаём регистрацию
      registration = await schoolDb.examRegistration.create({
        data: {
          sessionId: data.sessionId,
          userId: progress.userId,
          studentProgressId: data.progressId,
        },
      })
    }

    // Создаём попытку
    const attempt = await schoolDb.examAttempt.create({
      data: {
        sessionId: data.sessionId,
        registrationId: registration.id,
        userId: progress.userId,
        result: data.result,
        score: data.score ?? null,
        notes: data.notes ?? null,
        gradedAt: new Date(),
        gradedById: schoolAuthResult.user.id,
      },
    })

    return { success: true, attemptId: attempt.id }
  } catch (error) {
    console.error('Ошибка записи результата теории:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение попыток внутреннего экзамена по теории ===

export async function getInternalTheoryAttemptsAction(progressId: string): Promise<GetAttemptsResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: { id: progressId },
      select: { id: true, organizationId: true, userId: true },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Получаем все попытки напрямую через ExamAttempt
    const attemptRecords = await schoolDb.examAttempt.findMany({
      where: {
        userId: progress.userId,
        session: {
          type: 'INTERNAL_THEORY',
        },
        registration: {
          studentProgressId: progressId,
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
    const graders = await schoolDb.user.findMany({
      where: { id: { in: graderIds } },
      select: { id: true, name: true },
    })
    const graderMap = new Map(graders.map((g) => [g.id, g]))

    const summaries: InternalTheoryAttemptSummary[] = attemptRecords.map((attempt) => ({
      id: attempt.id,
      sessionId: attempt.session.id,
      sessionDate: attempt.session.scheduledAt,
      result: attempt.result,
      score: attempt.score,
      gradedAt: attempt.gradedAt,
      gradedBy: attempt.gradedById ? (graderMap.get(attempt.gradedById) ?? null) : null,
    }))

    return { success: true, attempts: summaries }
  } catch (error) {
    console.error('Ошибка получения попыток теории:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Назначение в учебную группу ===

export interface AssignToStudyGroupData {
  progressId: string
  studyGroupId: string
}

export async function assignToStudyGroupAction(data: AssignToStudyGroupData): Promise<TheoryActionResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: { id: data.progressId },
      select: { id: true, organizationId: true, userId: true },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Проверяем группу
    const group = await schoolDb.studyGroup.findUnique({
      where: { id: data.studyGroupId },
      select: { id: true, organizationId: true, isActive: true },
    })

    if (!group) {
      return { success: false, error: 'NOT_FOUND', message: 'Учебная группа не найдена' }
    }

    if (group.organizationId !== progress.organizationId) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Группа принадлежит другой школе' }
    }

    if (!group.isActive) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Группа неактивна' }
    }

    // ZenStack v3: $transaction не поддерживается напрямую, используем последовательные операции
    // Обновляем прогресс
    await schoolDb.studentProgress.update({
      where: { id: data.progressId },
      data: {
        studyGroupId: data.studyGroupId,
        theoryStatus: 'IN_PROGRESS',
        theoryStartedAt: new Date(),
      },
    })

    // Добавляем в группу
    await schoolDb.studyGroupMember.upsert({
      where: {
        groupId_userId: {
          userId: progress.userId,
          groupId: data.studyGroupId,
        },
      },
      create: {
        userId: progress.userId,
        groupId: data.studyGroupId,
      },
      update: {
        leftAt: null,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка назначения в группу:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
