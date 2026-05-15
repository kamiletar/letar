/**
 * Сервис для управления предоплаченными занятиями
 *
 * Бизнес-логика:
 * - Инструктор пополняет баланс ученика
 * - При завершении занятия (COMPLETED) списывается 1 занятие
 * - При неявке (NO_SHOW) списывается 1 занятие
 * - Максимальный лимит: 50 занятий
 */

import type { ConnectionStatus } from '@letar/driving-school-db/prisma'

// === Константы ===

export const MAX_PREPAID_LESSONS = 50

// === Типы ===

export interface ConnectionData {
  id: string
  studentId: string
  instructorId: string
  prepaidLessons: number
  status: ConnectionStatus
}

export interface BalanceRepository {
  getConnection: (studentId: string, instructorId: string) => Promise<ConnectionData | null>
  updatePrepaidBalance: (connectionId: string, newBalance: number) => Promise<void>
}

export type GetBalanceResult = { success: true; balance: number } | { success: false; error: 'CONNECTION_NOT_FOUND' }

export type AddPrepaidResult =
  | { success: true; newBalance: number; previousBalance: number }
  | { success: false; error: 'CONNECTION_NOT_FOUND' | 'CONNECTION_NOT_ACTIVE' | 'INVALID_AMOUNT' | 'EXCEEDS_LIMIT' }

export type DeductReason = 'COMPLETED' | 'NO_SHOW'

export type DeductPrepaidResult =
  | { success: true; newBalance: number; deducted: number; reason: DeductReason }
  | { success: false; error: 'CONNECTION_NOT_FOUND' | 'INSUFFICIENT_BALANCE' }

// === Функции ===

/**
 * Получение текущего баланса предоплаченных занятий
 */
export async function getPrepaidBalance(
  studentId: string,
  instructorId: string,
  repo: BalanceRepository
): Promise<GetBalanceResult> {
  const connection = await repo.getConnection(studentId, instructorId)

  if (!connection) {
    return { success: false, error: 'CONNECTION_NOT_FOUND' }
  }

  return { success: true, balance: connection.prepaidLessons }
}

/**
 * Пополнение баланса предоплаченных занятий
 */
export async function addPrepaidLessons(
  studentId: string,
  instructorId: string,
  amount: number,
  repo: BalanceRepository
): Promise<AddPrepaidResult> {
  // Валидация количества
  if (amount <= 0) {
    return { success: false, error: 'INVALID_AMOUNT' }
  }

  // Получаем связь
  const connection = await repo.getConnection(studentId, instructorId)

  if (!connection) {
    return { success: false, error: 'CONNECTION_NOT_FOUND' }
  }

  // Проверяем активность связи
  if (connection.status !== 'ACTIVE') {
    return { success: false, error: 'CONNECTION_NOT_ACTIVE' }
  }

  // Проверяем лимит
  const newBalance = connection.prepaidLessons + amount
  if (newBalance > MAX_PREPAID_LESSONS) {
    return { success: false, error: 'EXCEEDS_LIMIT' }
  }

  // Обновляем баланс
  await repo.updatePrepaidBalance(connection.id, newBalance)

  return {
    success: true,
    newBalance,
    previousBalance: connection.prepaidLessons,
  }
}

/**
 * Списание одного занятия с баланса
 */
export async function deductPrepaidLesson(
  studentId: string,
  instructorId: string,
  reason: DeductReason,
  repo: BalanceRepository
): Promise<DeductPrepaidResult> {
  // Получаем связь
  const connection = await repo.getConnection(studentId, instructorId)

  if (!connection) {
    return { success: false, error: 'CONNECTION_NOT_FOUND' }
  }

  // Проверяем баланс
  if (connection.prepaidLessons <= 0) {
    return { success: false, error: 'INSUFFICIENT_BALANCE' }
  }

  // Списываем одно занятие
  const newBalance = connection.prepaidLessons - 1
  await repo.updatePrepaidBalance(connection.id, newBalance)

  return {
    success: true,
    newBalance,
    deducted: 1,
    reason,
  }
}
