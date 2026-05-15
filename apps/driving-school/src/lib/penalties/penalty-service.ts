/**
 * Сервис для управления штрафами
 *
 * Бизнес-логика:
 * - Штраф за позднюю отмену (LATE_CANCEL) — отмена менее чем за lateCancelHours до занятия
 * - Штраф за неявку (NO_SHOW) — ученик не явился на занятие
 * - Инструктор может отменить штраф с указанием причины
 * - Инструктор может отметить штраф как оплаченный
 */

import type { PenaltyStatus, PenaltyType } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface InstructorSettings {
  instructorId: string
  lateCancelHours: number
  lateCancelPenalty: number | null
  noShowPenalty: number | null
}

export interface PenaltyData {
  id: string
  studentId: string
  instructorId: string
  lessonId: string | null
  type: PenaltyType
  status: PenaltyStatus
  amount: number
  chargedAt: Date
  paidAt: Date | null
  cancelledAt: Date | null
  cancelReason: string | null
}

export interface PenaltyRepository {
  getInstructorSettings: (instructorId: string) => Promise<InstructorSettings | null>
  createPenalty: (data: {
    studentId: string
    instructorId: string
    lessonId: string | null
    type: PenaltyType
    amount: number
  }) => Promise<{ id: string }>
  updatePenalty: (
    penaltyId: string,
    data: {
      status: PenaltyStatus
      paidAt?: Date
      cancelledAt?: Date
      cancelReason?: string
    }
  ) => Promise<void>
  getPenaltyById: (penaltyId: string) => Promise<PenaltyData | null>
}

// === Результаты ===

export type GetSettingsResult =
  | { success: true; settings: InstructorSettings }
  | { success: false; error: 'INSTRUCTOR_NOT_FOUND' }

export type ChargePenaltyResult =
  | { success: true; penaltyId: string; amount: number; type: PenaltyType }
  | { success: false; error: 'INSTRUCTOR_NOT_FOUND' | 'PENALTY_NOT_CONFIGURED' }

export type CancelPenaltyResult =
  | { success: true }
  | { success: false; error: 'PENALTY_NOT_FOUND' | 'PENALTY_ALREADY_CANCELLED' | 'PENALTY_ALREADY_PAID' }

export type MarkPaidResult =
  | { success: true }
  | { success: false; error: 'PENALTY_NOT_FOUND' | 'PENALTY_ALREADY_PAID' | 'PENALTY_CANCELLED' }

// === Функции ===

/**
 * Рассчитывает дедлайн отмены занятия без штрафа
 * @param lessonStartTime - время начала занятия
 * @param lateCancelHours - за сколько часов до занятия можно отменить без штрафа
 * @returns дедлайн отмены (DateTime)
 */
export function calculateCancelDeadline(lessonStartTime: Date, lateCancelHours: number): Date {
  const deadline = new Date(lessonStartTime)
  deadline.setHours(deadline.getHours() - lateCancelHours)
  return deadline
}

/**
 * Проверяет, является ли отмена поздней (после дедлайна)
 * @param lessonStartTime - время начала занятия
 * @param cancelTime - время отмены
 * @param lateCancelHours - за сколько часов до занятия можно отменить без штрафа
 * @returns true если отмена поздняя
 */
export function isLateCancellation(lessonStartTime: Date, cancelTime: Date, lateCancelHours: number): boolean {
  const deadline = calculateCancelDeadline(lessonStartTime, lateCancelHours)
  return cancelTime.getTime() > deadline.getTime()
}

/**
 * Получает настройки штрафов инструктора
 */
export async function getPenaltySettings(instructorId: string, repo: PenaltyRepository): Promise<GetSettingsResult> {
  const settings = await repo.getInstructorSettings(instructorId)

  if (!settings) {
    return { success: false, error: 'INSTRUCTOR_NOT_FOUND' }
  }

  return { success: true, settings }
}

/**
 * Начисляет штраф
 */
export async function chargePenalty(params: {
  studentId: string
  instructorId: string
  lessonId: string | null
  type: PenaltyType
  repo: PenaltyRepository
}): Promise<ChargePenaltyResult> {
  const { studentId, instructorId, lessonId, type, repo } = params

  // Получаем настройки инструктора
  const settings = await repo.getInstructorSettings(instructorId)

  if (!settings) {
    return { success: false, error: 'INSTRUCTOR_NOT_FOUND' }
  }

  // Определяем сумму штрафа в зависимости от типа
  let amount: number | null = null

  if (type === 'LATE_CANCEL') {
    amount = settings.lateCancelPenalty
  } else if (type === 'NO_SHOW') {
    amount = settings.noShowPenalty
  }

  // Если штраф не настроен — не начисляем
  if (amount === null) {
    return { success: false, error: 'PENALTY_NOT_CONFIGURED' }
  }

  // Создаём штраф
  const penalty = await repo.createPenalty({
    studentId,
    instructorId,
    lessonId,
    type,
    amount,
  })

  return {
    success: true,
    penaltyId: penalty.id,
    amount,
    type,
  }
}

/**
 * Отменяет штраф
 */
export async function cancelPenalty(
  penaltyId: string,
  reason: string | undefined,
  repo: PenaltyRepository
): Promise<CancelPenaltyResult> {
  // Получаем штраф
  const penalty = await repo.getPenaltyById(penaltyId)

  if (!penalty) {
    return { success: false, error: 'PENALTY_NOT_FOUND' }
  }

  // Проверяем статус
  if (penalty.status === 'CANCELLED') {
    return { success: false, error: 'PENALTY_ALREADY_CANCELLED' }
  }

  if (penalty.status === 'PAID') {
    return { success: false, error: 'PENALTY_ALREADY_PAID' }
  }

  // Отменяем штраф
  await repo.updatePenalty(penaltyId, {
    status: 'CANCELLED',
    cancelledAt: new Date(),
    cancelReason: reason,
  })

  return { success: true }
}

/**
 * Отмечает штраф как оплаченный
 */
export async function markPenaltyAsPaid(penaltyId: string, repo: PenaltyRepository): Promise<MarkPaidResult> {
  // Получаем штраф
  const penalty = await repo.getPenaltyById(penaltyId)

  if (!penalty) {
    return { success: false, error: 'PENALTY_NOT_FOUND' }
  }

  // Проверяем статус
  if (penalty.status === 'PAID') {
    return { success: false, error: 'PENALTY_ALREADY_PAID' }
  }

  if (penalty.status === 'CANCELLED') {
    return { success: false, error: 'PENALTY_CANCELLED' }
  }

  // Отмечаем как оплаченный
  await repo.updatePenalty(penaltyId, {
    status: 'PAID',
    paidAt: new Date(),
  })

  return { success: true }
}
