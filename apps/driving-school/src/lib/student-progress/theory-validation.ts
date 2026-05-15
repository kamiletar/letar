/**
 * Theory Validation — Валидация теории ГИБДД
 *
 * Правила:
 * - Теория ГИБДД действует 6 месяцев после сдачи
 * - Интервалы пересдачи:
 *   - Попытки 1-3: 7-30 дней
 *   - С 4-й попытки: 6-9 месяцев
 */

import type { ExamResult, ExamType } from '@letar/driving-school-db/prisma'

const THEORY_VALIDITY_DAYS = 180 // 6 месяцев

export interface TheoryRetryStatus {
  canRetry: boolean
  minDaysUntilRetry: number
  maxDaysUntilRetry: number
  nextRetryDate: Date | null
  attemptNumber: number
  isInCooldown: boolean
}

export interface TheoryValidityStatus {
  isValid: boolean
  passedAt: Date | null
  expiresAt: Date | null
  daysUntilExpiry: number | null
  isExpiring: boolean // Осталось < 30 дней
  isExpired: boolean
}

/**
 * Интерфейс попытки экзамена для валидации
 */
export interface ExamAttemptForValidation {
  result: ExamResult
  gradedAt: Date | null
  createdAt: Date
}

/**
 * Интерфейс записи на экзамен с сессией для валидации
 */
export interface ExamRegistrationWithSession {
  session: {
    type: ExamType
  }
  attempt: ExamAttemptForValidation | null
}

/**
 * Проверяет, действительна ли сданная теория ГИБДД
 *
 * @param passedAt Дата сдачи теории ГИБДД
 * @param referenceDate Дата для проверки (по умолчанию — сегодня)
 */
export function isGibddTheoryValid(passedAt: Date | null, referenceDate = new Date()): boolean {
  if (!passedAt) {
    return false
  }

  const expiryDate = new Date(passedAt)
  expiryDate.setDate(expiryDate.getDate() + THEORY_VALIDITY_DAYS)

  return referenceDate < expiryDate
}

/**
 * Возвращает количество дней до истечения теории ГИБДД
 *
 * @param passedAt Дата сдачи теории ГИБДД
 * @param referenceDate Дата для проверки (по умолчанию — сегодня)
 * @returns Количество дней (отрицательное если уже истекла, null если не сдавали)
 */
export function daysUntilTheoryExpires(passedAt: Date | null, referenceDate = new Date()): number | null {
  if (!passedAt) {
    return null
  }

  const expiryDate = new Date(passedAt)
  expiryDate.setDate(expiryDate.getDate() + THEORY_VALIDITY_DAYS)

  const diffMs = expiryDate.getTime() - referenceDate.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Возвращает полный статус действительности теории
 */
export function getTheoryValidityStatus(passedAt: Date | null, referenceDate = new Date()): TheoryValidityStatus {
  if (!passedAt) {
    return {
      isValid: false,
      passedAt: null,
      expiresAt: null,
      daysUntilExpiry: null,
      isExpiring: false,
      isExpired: false,
    }
  }

  const expiryDate = new Date(passedAt)
  expiryDate.setDate(expiryDate.getDate() + THEORY_VALIDITY_DAYS)

  // passedAt is not null here, so daysUntilTheoryExpires will return a number
  const daysLeft = daysUntilTheoryExpires(passedAt, referenceDate) ?? 0
  const isValid = daysLeft > 0
  const isExpiring = daysLeft > 0 && daysLeft <= 30

  return {
    isValid,
    passedAt,
    expiresAt: expiryDate,
    daysUntilExpiry: daysLeft,
    isExpiring,
    isExpired: daysLeft <= 0,
  }
}

/**
 * Возвращает статус возможности пересдачи теории ГИБДД
 *
 * Правила интервалов:
 * - Попытки 1-3: 7-30 дней
 * - С 4-й попытки: 6-9 месяцев (180-270 дней)
 *
 * @param attempts Массив попыток экзамена (отсортированный по дате)
 * @param referenceDate Дата для проверки (по умолчанию — сегодня)
 */
export function getTheoryRetryStatus(
  attempts: ExamAttemptForValidation[],
  referenceDate = new Date()
): TheoryRetryStatus {
  // Если нет попыток, можно сдавать
  if (attempts.length === 0) {
    return {
      canRetry: true,
      minDaysUntilRetry: 0,
      maxDaysUntilRetry: 0,
      nextRetryDate: null,
      attemptNumber: 1,
      isInCooldown: false,
    }
  }

  // Фильтруем только неудачные попытки (FAILED или NO_SHOW)
  const failedAttempts = attempts.filter((a) => a.result !== 'PASSED' && a.gradedAt)

  // Если последняя попытка успешная, пересдача не нужна
  const lastAttempt = attempts[attempts.length - 1]
  if (lastAttempt.result === 'PASSED') {
    return {
      canRetry: false,
      minDaysUntilRetry: 0,
      maxDaysUntilRetry: 0,
      nextRetryDate: null,
      attemptNumber: attempts.length,
      isInCooldown: false,
    }
  }

  const attemptNumber = failedAttempts.length + 1
  const lastFailedAttempt = failedAttempts[failedAttempts.length - 1]
  const lastFailedAt = lastFailedAttempt?.gradedAt ?? lastFailedAttempt?.createdAt

  if (!lastFailedAt) {
    return {
      canRetry: true,
      minDaysUntilRetry: 0,
      maxDaysUntilRetry: 0,
      nextRetryDate: null,
      attemptNumber,
      isInCooldown: false,
    }
  }

  // Определяем интервал в зависимости от номера попытки
  let minDays: number
  let maxDays: number

  if (attemptNumber <= 3) {
    // Попытки 1-3: 7-30 дней
    minDays = 7
    maxDays = 30
  } else {
    // С 4-й попытки: 6-9 месяцев
    minDays = 180
    maxDays = 270
  }

  const lastFailedDate = new Date(lastFailedAt)
  const minRetryDate = new Date(lastFailedDate)
  minRetryDate.setDate(minRetryDate.getDate() + minDays)

  const daysSinceLastAttempt = Math.floor((referenceDate.getTime() - lastFailedDate.getTime()) / (1000 * 60 * 60 * 24))

  const canRetry = daysSinceLastAttempt >= minDays
  const daysUntilCanRetry = Math.max(0, minDays - daysSinceLastAttempt)

  return {
    canRetry,
    minDaysUntilRetry: daysUntilCanRetry,
    maxDaysUntilRetry: Math.max(0, maxDays - daysSinceLastAttempt),
    nextRetryDate: canRetry ? null : minRetryDate,
    attemptNumber,
    isInCooldown: !canRetry && attemptNumber > 3,
  }
}

/**
 * Находит дату последней успешной сдачи теории ГИБДД
 *
 * @param registrations Записи на экзамены с сессиями и попытками
 */
export function findGibddTheoryPassedDate(registrations: ExamRegistrationWithSession[]): Date | null {
  const theoryRegistrations = registrations.filter((r) => r.session.type === 'GIBDD_THEORY')

  for (const reg of theoryRegistrations) {
    if (reg.attempt?.result === 'PASSED') {
      const passedAt = reg.attempt.gradedAt ?? reg.attempt.createdAt
      return new Date(passedAt)
    }
  }

  return null
}
