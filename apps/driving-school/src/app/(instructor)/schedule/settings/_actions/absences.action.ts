'use server'

import { withInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import type { DbClient } from '@/lib/db-types'
import type { AbsenceType } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface AbsenceData {
  id: string
  type: AbsenceType
  startDate: Date
  endDate: Date | null
  reason: string | null
  isActive: boolean
  createdAt: Date
  returnedAt: Date | null
}

export type GetAbsencesResult = { success: true; absences: AbsenceData[] } | { success: false; error: string }

export type CreateAbsenceResult =
  | { success: true; absence: AbsenceData; slotsBlocked: number }
  | { success: false; error: string }

export type EndAbsenceResult = { success: true; slotsUnblocked: number } | { success: false; error: string }

export type DeleteAbsenceResult = { success: true; slotsUnblocked: number } | { success: false; error: string }

// === Хелперы ===

/**
 * Блокирует слоты в указанном периоде
 */
async function blockSlotsInPeriod(db: DbClient, instructorId: string, startDate: Date, endDate: Date): Promise<number> {
  const result = await db.timeSlot.updateMany({
    where: {
      instructorId,
      startTime: { gte: startDate },
      endTime: { lte: endDate },
      status: 'AVAILABLE',
    },
    data: { status: 'BLOCKED' },
  })
  return result.count
}

/**
 * Разблокирует слоты в указанном периоде
 */
async function unblockSlotsInPeriod(
  db: DbClient,
  instructorId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db.timeSlot.updateMany({
    where: {
      instructorId,
      startTime: { gte: startDate },
      endTime: { lte: endDate },
      status: 'BLOCKED',
    },
    data: { status: 'AVAILABLE' },
  })
  return result.count
}

// === Server Actions ===

/**
 * Получение списка отсутствий инструктора
 */
export async function getAbsences(): Promise<GetAbsencesResult> {
  return withInstructor(async (user, instructorId) => {
    const db = getEnhancedPrisma(user)
    try {
      const absences = await db.absence.findMany({
        where: { instructorId },
        orderBy: { startDate: 'desc' },
      })

      return {
        success: true,
        absences: absences.map((a) => ({
          id: a.id,
          type: a.type,
          startDate: a.startDate,
          endDate: a.endDate,
          reason: a.reason,
          isActive: a.isActive,
          createdAt: a.createdAt,
          returnedAt: a.returnedAt,
        })),
      }
    } catch (error) {
      console.error('getAbsences error:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

/**
 * Создание отсутствия (отпуск, больничный)
 */
export async function createAbsence(
  type: AbsenceType,
  startDate: Date,
  endDate: Date | null,
  reason?: string
): Promise<CreateAbsenceResult> {
  // Для отпуска endDate обязательна
  if (type === 'VACATION' && !endDate) {
    return { success: false, error: 'Укажите дату окончания отпуска' }
  }

  return withInstructor(async (user, instructorId) => {
    const db = getEnhancedPrisma(user)
    try {
      // Создаём отсутствие
      const absence = await db.absence.create({
        data: {
          instructorId,
          type,
          startDate,
          endDate,
          reason: reason || null,
          isActive: true,
        },
      })

      // Блокируем слоты на период отсутствия
      // Для больничного без endDate блокируем на 30 дней вперёд
      const blockEndDate = endDate || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      const slotsBlocked = await blockSlotsInPeriod(db, instructorId, startDate, blockEndDate)

      return {
        success: true,
        absence: {
          id: absence.id,
          type: absence.type,
          startDate: absence.startDate,
          endDate: absence.endDate,
          reason: absence.reason,
          isActive: absence.isActive,
          createdAt: absence.createdAt,
          returnedAt: absence.returnedAt,
        },
        slotsBlocked,
      }
    } catch (error) {
      console.error('createAbsence error:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

/**
 * Завершение отсутствия (установка даты возврата)
 */
export async function endAbsence(absenceId: string, returnDate?: Date): Promise<EndAbsenceResult> {
  return withInstructor(async (user, instructorId) => {
    const db = getEnhancedPrisma(user)
    try {
      // Находим отсутствие
      const absence = await db.absence.findFirst({
        where: { id: absenceId, instructorId },
      })

      if (!absence) {
        return { success: false, error: 'Отсутствие не найдено' }
      }

      if (!absence.isActive) {
        return { success: false, error: 'Отсутствие уже завершено' }
      }

      const endDate = returnDate || new Date()

      // Обновляем отсутствие
      await db.absence.update({
        where: { id: absenceId },
        data: {
          isActive: false,
          endDate,
          returnedAt: new Date(),
        },
      })

      // Разблокируем слоты после даты возврата
      // Если были заблокированы слоты после endDate, разблокируем их
      const originalEndDate = absence.endDate || new Date(absence.startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

      let slotsUnblocked = 0
      if (endDate < originalEndDate) {
        // Разблокируем слоты между новой датой окончания и старой
        slotsUnblocked = await unblockSlotsInPeriod(db, instructorId, endDate, originalEndDate)
      }

      return { success: true, slotsUnblocked }
    } catch (error) {
      console.error('endAbsence error:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

/**
 * Удаление отсутствия
 */
export async function deleteAbsence(absenceId: string): Promise<DeleteAbsenceResult> {
  return withInstructor(async (user, instructorId) => {
    const db = getEnhancedPrisma(user)
    try {
      // Находим отсутствие
      const absence = await db.absence.findFirst({
        where: { id: absenceId, instructorId },
      })

      if (!absence) {
        return { success: false, error: 'Отсутствие не найдено' }
      }

      // Разблокируем слоты
      const endDate = absence.endDate || new Date(absence.startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      const slotsUnblocked = await unblockSlotsInPeriod(db, instructorId, absence.startDate, endDate)

      // Удаляем отсутствие
      await db.absence.delete({
        where: { id: absenceId },
      })

      return { success: true, slotsUnblocked }
    } catch (error) {
      console.error('deleteAbsence error:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}
