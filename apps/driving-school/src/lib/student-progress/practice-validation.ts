/**
 * Practice Validation — Валидация практики ГИБДД
 *
 * Правила:
 * - 3 попытки практики ГИБДД
 * - После 3-й неудачной попытки — 6 месяцев cooldown
 * - Допуск инструктора обязателен для экзамена практики ГИБДД
 */

import type { ApprovalStatus, ExamType, PracticeStatus, TheoryStatus } from '@letar/driving-school-db/prisma'

import type { ExamAttemptForValidation, ExamRegistrationWithSession } from './theory-validation'

const PRACTICE_MAX_ATTEMPTS = 3
const PRACTICE_COOLDOWN_DAYS = 180 // 6 месяцев

export interface PracticeAttemptStatus {
  canAttempt: boolean
  attemptNumber: number
  attemptsRemaining: number
  isInCooldown: boolean
  cooldownEndsAt: Date | null
  daysUntilCooldownEnds: number | null
}

export interface PracticeExamReadiness {
  isReady: boolean
  reasons: PracticeNotReadyReason[]
  instructorApproval: {
    status: ApprovalStatus
    isApproved: boolean
    approvedAt: Date | null
  }
  theoryStatus: {
    isCompleted: boolean
  }
  practiceStatus: {
    status: PracticeStatus
    lessonsCompleted: number
    isCompleted: boolean
  }
}

export type PracticeNotReadyReason =
  | 'INSTRUCTOR_APPROVAL_NOT_REQUESTED'
  | 'INSTRUCTOR_APPROVAL_PENDING'
  | 'INSTRUCTOR_APPROVAL_DENIED'
  | 'THEORY_NOT_COMPLETED'
  | 'PRACTICE_NOT_STARTED'
  | 'PRACTICE_NOT_COMPLETED'
  | 'IN_COOLDOWN'
  | 'NO_ATTEMPTS_LEFT'

/**
 * Возвращает статус возможности сдачи практического экзамена ГИБДД
 *
 * @param attempts Массив попыток экзамена практики
 * @param referenceDate Дата для проверки (по умолчанию — сегодня)
 */
export function getPracticeAttemptStatus(
  attempts: ExamAttemptForValidation[],
  referenceDate = new Date()
): PracticeAttemptStatus {
  // Если нет попыток, можно сдавать первую
  if (attempts.length === 0) {
    return {
      canAttempt: true,
      attemptNumber: 1,
      attemptsRemaining: PRACTICE_MAX_ATTEMPTS,
      isInCooldown: false,
      cooldownEndsAt: null,
      daysUntilCooldownEnds: null,
    }
  }

  // Если последняя попытка успешная, пересдача не нужна
  const lastAttempt = attempts[attempts.length - 1]
  if (lastAttempt.result === 'PASSED') {
    return {
      canAttempt: false,
      attemptNumber: attempts.length,
      attemptsRemaining: 0,
      isInCooldown: false,
      cooldownEndsAt: null,
      daysUntilCooldownEnds: null,
    }
  }

  // Считаем неудачные попытки (FAILED или NO_SHOW)
  const failedAttempts = attempts.filter((a) => a.result !== 'PASSED' && a.gradedAt)
  const failedCount = failedAttempts.length

  // Если меньше 3 неудачных попыток, можно сдавать
  if (failedCount < PRACTICE_MAX_ATTEMPTS) {
    return {
      canAttempt: true,
      attemptNumber: failedCount + 1,
      attemptsRemaining: PRACTICE_MAX_ATTEMPTS - failedCount,
      isInCooldown: false,
      cooldownEndsAt: null,
      daysUntilCooldownEnds: null,
    }
  }

  // 3 неудачные попытки — cooldown 6 месяцев
  const lastFailedAttempt = failedAttempts[failedAttempts.length - 1]
  const lastFailedAt = lastFailedAttempt?.gradedAt ?? lastFailedAttempt?.createdAt
  if (!lastFailedAt) {
    return {
      canAttempt: false,
      attemptNumber: failedCount + 1,
      attemptsRemaining: 0,
      isInCooldown: true,
      cooldownEndsAt: null,
      daysUntilCooldownEnds: null,
    }
  }

  const cooldownEndsAt = new Date(lastFailedAt)
  cooldownEndsAt.setDate(cooldownEndsAt.getDate() + PRACTICE_COOLDOWN_DAYS)

  const daysSinceLastAttempt = Math.floor(
    (referenceDate.getTime() - new Date(lastFailedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  const isInCooldown = daysSinceLastAttempt < PRACTICE_COOLDOWN_DAYS
  const daysUntilCooldownEnds = isInCooldown ? PRACTICE_COOLDOWN_DAYS - daysSinceLastAttempt : null

  return {
    canAttempt: !isInCooldown,
    attemptNumber: isInCooldown ? failedCount : 1, // После cooldown счётчик сбрасывается
    attemptsRemaining: isInCooldown ? 0 : PRACTICE_MAX_ATTEMPTS,
    isInCooldown,
    cooldownEndsAt: isInCooldown ? cooldownEndsAt : null,
    daysUntilCooldownEnds,
  }
}

/**
 * Интерфейс прогресса по категории для проверки готовности
 */
export interface CategoryProgressForReadiness {
  practiceStatus: PracticeStatus
  lessonsCompleted: number
  instructorApprovalStatus: ApprovalStatus
  instructorApprovedAt: Date | null
  progress: {
    theoryStatus: TheoryStatus
  }
}

/**
 * Проверяет готовность ученика к экзамену практики ГИБДД
 *
 * Требования:
 * 1. Теория школы завершена
 * 2. Практика завершена (все часы накатаны)
 * 3. Инструктор дал допуск
 * 4. Нет активного cooldown
 */
export function checkPracticeExamReadiness(
  categoryProgress: CategoryProgressForReadiness,
  practiceAttempts: ExamAttemptForValidation[] = []
): PracticeExamReadiness {
  const reasons: PracticeNotReadyReason[] = []

  // Проверка статуса допуска инструктора
  const approvalStatus = categoryProgress.instructorApprovalStatus
  const isApproved = approvalStatus === 'APPROVED'

  if (approvalStatus === 'NOT_REQUESTED') {
    reasons.push('INSTRUCTOR_APPROVAL_NOT_REQUESTED')
  } else if (approvalStatus === 'REQUESTED') {
    reasons.push('INSTRUCTOR_APPROVAL_PENDING')
  } else if (approvalStatus === 'DENIED') {
    reasons.push('INSTRUCTOR_APPROVAL_DENIED')
  }

  // Проверка статуса теории
  const theoryCompleted = categoryProgress.progress.theoryStatus === 'COMPLETED'
  if (!theoryCompleted) {
    reasons.push('THEORY_NOT_COMPLETED')
  }

  // Проверка статуса практики
  const practiceStatus = categoryProgress.practiceStatus
  const practiceCompleted = practiceStatus === 'COMPLETED'

  if (practiceStatus === 'NOT_STARTED') {
    reasons.push('PRACTICE_NOT_STARTED')
  } else if (practiceStatus === 'IN_PROGRESS') {
    reasons.push('PRACTICE_NOT_COMPLETED')
  }

  // Проверка cooldown
  const attemptStatus = getPracticeAttemptStatus(practiceAttempts)
  if (attemptStatus.isInCooldown) {
    reasons.push('IN_COOLDOWN')
  } else if (!attemptStatus.canAttempt && attemptStatus.attemptsRemaining === 0) {
    // Это не должно случиться после cooldown, но на всякий случай
    reasons.push('NO_ATTEMPTS_LEFT')
  }

  return {
    isReady: reasons.length === 0,
    reasons,
    instructorApproval: {
      status: approvalStatus,
      isApproved,
      approvedAt: categoryProgress.instructorApprovedAt,
    },
    theoryStatus: {
      isCompleted: theoryCompleted,
    },
    practiceStatus: {
      status: practiceStatus,
      lessonsCompleted: categoryProgress.lessonsCompleted,
      isCompleted: practiceCompleted,
    },
  }
}

/**
 * Находит дату последней успешной сдачи практики ГИБДД
 *
 * @param registrations Записи на экзамены с попытками
 * @param examTypes Типы экзаменов практики (area, city)
 */
export function findGibddPracticePassedDate(
  registrations: ExamRegistrationWithSession[],
  examTypes: ExamType[] = ['GIBDD_PRACTICE_AREA', 'GIBDD_PRACTICE_CITY']
): Date | null {
  const practiceRegistrations = registrations.filter((r) => examTypes.includes(r.session.type))

  // Для получения прав нужно сдать ОБА экзамена (площадка и город)
  // Возвращаем дату последнего успешного экзамена
  let latestPassedDate: Date | null = null

  for (const reg of practiceRegistrations) {
    if (reg.attempt?.result === 'PASSED') {
      const passedAt = reg.attempt.gradedAt ?? reg.attempt.createdAt
      const passedDate = new Date(passedAt)
      if (!latestPassedDate || passedDate > latestPassedDate) {
        latestPassedDate = passedDate
      }
    }
  }

  return latestPassedDate
}
