'use server'

import { revalidatePath } from 'next/cache'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'
import { getStageUpdateData, isValidTransition, type KanbanStage } from '../_lib/kanban-config'

// === Типы ===

export type MoveStudentResult = { success: true } | { success: false; error: ActionErrorCode; message?: string }

// === Перемещение ученика на новый этап ===

export async function moveStudentAction(
  progressId: string,
  fromStage: KanbanStage,
  toStage: KanbanStage
): Promise<MoveStudentResult> {
  try {
    // Получаем прогресс и проверяем доступ
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Находим прогресс ученика
    const progress = await db.studentProgress.findUnique({
      where: { id: progressId },
      include: {
        categoryProgress: {
          select: { id: true },
        },
      },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND', message: 'Прогресс ученика не найден' }
    }

    // Проверяем права на эту школу
    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    // Проверяем допустимость перехода
    if (!isValidTransition(fromStage, toStage)) {
      return {
        success: false,
        error: 'INVALID_TRANSITION',
        message: `Нельзя перейти из "${fromStage}" в "${toStage}"`,
      }
    }

    // Получаем данные для обновления
    const updateData = getStageUpdateData(toStage)
    if (!updateData) {
      return {
        success: false,
        error: 'INVALID_TRANSITION',
        message: 'Этот переход недоступен через Kanban',
      }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Если переходим на этап практики или дальше — проверяем наличие категорий
    if ((toStage === 'practice' || toStage === 'ready') && progress.categoryProgress.length === 0) {
      return {
        success: false,
        error: 'NO_CATEGORIES',
        message: 'Добавьте категорию обучения для перехода на этот этап',
      }
    }

    // Обновляем основной прогресс
    await schoolDb.studentProgress.update({
      where: { id: progressId },
      data: {
        status: updateData.status,
        documentsStatus: updateData.documentsStatus,
        theoryStatus: updateData.theoryStatus,
        // Обновляем даты при необходимости
        ...(updateData.documentsStatus === 'READY' &&
          !progress.documentsReadyAt && {
            documentsReadyAt: new Date(),
          }),
        ...(updateData.theoryStatus === 'IN_PROGRESS' &&
          !progress.theoryStartedAt && {
            theoryStartedAt: new Date(),
          }),
        ...(updateData.theoryStatus === 'COMPLETED' &&
          !progress.theoryCompletedAt && {
            theoryCompletedAt: new Date(),
          }),
      },
    })

    // Если есть обновление практики — обновляем все категории
    if (updateData.practiceStatus && progress.categoryProgress.length > 0) {
      await schoolDb.categoryProgress.updateMany({
        where: { progressId },
        data: { practiceStatus: updateData.practiceStatus },
      })
    }

    // Инвалидируем кэш
    revalidatePath('/school/progress/kanban')
    revalidatePath(`/school/progress/${progress.organizationId}`)

    return { success: true }
  } catch (error) {
    console.error('Ошибка перемещения ученика:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
