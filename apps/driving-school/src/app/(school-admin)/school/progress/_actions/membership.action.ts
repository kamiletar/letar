'use server'

import type { ProgressStatus } from '@letar/driving-school-db/prisma'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'

// === Результаты операций ===

export type MembershipActionResult = { success: true } | { success: false; error: ActionErrorCode; message?: string }

export type GetStudentStatusResult =
  | {
      success: true
      status: {
        progressStatus: ProgressStatus
        expelledAt: Date | null
        expelledReason: string | null
        canBeRemoved: boolean
      }
    }
  | { success: false; error: ActionErrorCode }

// === Удаление ученика из школы (без прогресса) ===

export async function removeStudentFromSchoolAction(membershipId: string): Promise<MembershipActionResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const membership = await db.member.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        userId: true,
        organizationId: true,
      },
    })

    if (!membership) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(membership.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Проверяем, что у ученика нет прогресса
    const hasProgress = await schoolDb.studentProgress.findFirst({
      where: {
        userId: membership.userId,
        organizationId: membership.organizationId,
      },
    })

    if (hasProgress) {
      return {
        success: false,
        error: 'HAS_PROGRESS',
        message: 'У ученика есть прогресс обучения. Используйте отчисление.',
      }
    }

    // Удаляем членство
    await schoolDb.member.delete({
      where: { id: membershipId },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления ученика:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Отчисление ученика ===

export interface ExpelStudentData {
  progressId: string
  reason: string
}

export async function expelStudentAction(data: ExpelStudentData): Promise<MembershipActionResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: { id: data.progressId },
      select: { id: true, organizationId: true, status: true },
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

    if (progress.status === 'EXPELLED') {
      return { success: false, error: 'ALREADY_EXPELLED', message: 'Ученик уже отчислен' }
    }

    if (!data.reason || data.reason.trim().length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Укажите причину отчисления' }
    }

    await schoolDb.studentProgress.update({
      where: { id: data.progressId },
      data: {
        status: 'EXPELLED',
        expelledAt: new Date(),
        expelledReason: data.reason.trim(),
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка отчисления:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Приостановка обучения ===

export async function suspendStudentAction(progressId: string): Promise<MembershipActionResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: { id: progressId },
      select: { id: true, organizationId: true, status: true },
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

    if (progress.status === 'SUSPENDED') {
      return { success: false, error: 'ALREADY_SUSPENDED', message: 'Обучение уже приостановлено' }
    }

    if (progress.status !== 'ACTIVE') {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Можно приостановить только активное обучение' }
    }

    await schoolDb.studentProgress.update({
      where: { id: progressId },
      data: {
        status: 'SUSPENDED',
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка приостановки:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Возобновление обучения ===

export async function resumeStudentAction(progressId: string): Promise<MembershipActionResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: { id: progressId },
      select: { id: true, organizationId: true, status: true },
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

    if (progress.status !== 'SUSPENDED') {
      return { success: false, error: 'NOT_SUSPENDED', message: 'Обучение не приостановлено' }
    }

    await schoolDb.studentProgress.update({
      where: { id: progressId },
      data: {
        status: 'ACTIVE',
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка возобновления:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение статуса ученика ===

export async function getStudentStatusAction(userId: string, schoolId: string): Promise<GetStudentStatusResult> {
  try {
    const authResult = await requireSchoolManager(schoolId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: schoolId },
      },
      select: {
        status: true,
        expelledAt: true,
        expelledReason: true,
      },
    })

    if (!progress) {
      // Проверяем, есть ли членство
      const membership = await db.member.findFirst({
        where: { userId, organizationId: schoolId },
      })

      if (!membership) {
        return { success: false, error: 'NOT_FOUND' }
      }

      // Есть членство, но нет прогресса — можно удалить
      return {
        success: true,
        status: {
          progressStatus: 'ACTIVE',
          expelledAt: null,
          expelledReason: null,
          canBeRemoved: true,
        },
      }
    }

    return {
      success: true,
      status: {
        progressStatus: progress.status,
        expelledAt: progress.expelledAt,
        expelledReason: progress.expelledReason,
        canBeRemoved: false, // Есть прогресс — удалить нельзя
      },
    }
  } catch (error) {
    console.error('Ошибка получения статуса:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
