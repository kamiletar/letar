import type { ApprovalStatus, DocumentsStatus, PracticeStatus, TheoryStatus } from '@letar/driving-school-db/prisma'

/**
 * Данные для расчёта общего прогресса ученика
 */
export interface ProgressCalculationInput {
  documentsStatus: DocumentsStatus
  stateFeePaidAt: Date | null
  theoryStatus: TheoryStatus
  licenseIssuedAt: Date | null
  categoryProgress: Array<{
    practiceStatus: PracticeStatus
    instructorApprovalStatus: ApprovalStatus
  }>
}

/**
 * Весовые коэффициенты для расчёта прогресса
 */
const PROGRESS_WEIGHTS = {
  documents: {
    READY: 15,
    IN_PROGRESS: 5,
  },
  stateFee: 5,
  theory: {
    COMPLETED: 20,
    IN_PROGRESS: 10,
  },
  category: {
    practiceCompleted: 20,
    practiceInProgress: 10,
    instructorApproved: 10,
  },
} as const

/**
 * Рассчитывает общий прогресс ученика (0-100%)
 *
 * Формула:
 * - Документы: READY +15%, IN_PROGRESS +5%
 * - Госпошлина: оплачена +5%
 * - Теория: COMPLETED +20%, IN_PROGRESS +10%
 * - Категории (среднее): практика COMPLETED +20%, IN_PROGRESS +10%, инструктор APPROVED +10%
 * - Права получены = 100%
 */
export function calculateOverallProgress(input: ProgressCalculationInput): number {
  // Если права получены — 100%
  if (input.licenseIssuedAt) {
    return 100
  }

  let progressPercent = 0

  // Документы
  if (input.documentsStatus === 'READY') {
    progressPercent += PROGRESS_WEIGHTS.documents.READY
  } else if (input.documentsStatus === 'IN_PROGRESS') {
    progressPercent += PROGRESS_WEIGHTS.documents.IN_PROGRESS
  }

  // Госпошлина
  if (input.stateFeePaidAt) {
    progressPercent += PROGRESS_WEIGHTS.stateFee
  }

  // Теория
  if (input.theoryStatus === 'COMPLETED') {
    progressPercent += PROGRESS_WEIGHTS.theory.COMPLETED
  } else if (input.theoryStatus === 'IN_PROGRESS') {
    progressPercent += PROGRESS_WEIGHTS.theory.IN_PROGRESS
  }

  // Прогресс по категориям (среднее)
  const categoryCount = input.categoryProgress.length
  if (categoryCount > 0) {
    const categoryProgressSum = input.categoryProgress.reduce((sum, cp) => {
      let cpProgress = 0

      if (cp.practiceStatus === 'COMPLETED') {
        cpProgress += PROGRESS_WEIGHTS.category.practiceCompleted
      } else if (cp.practiceStatus === 'IN_PROGRESS') {
        cpProgress += PROGRESS_WEIGHTS.category.practiceInProgress
      }

      if (cp.instructorApprovalStatus === 'APPROVED') {
        cpProgress += PROGRESS_WEIGHTS.category.instructorApproved
      }

      return sum + cpProgress
    }, 0)

    progressPercent += Math.round(categoryProgressSum / categoryCount)
  }

  return Math.min(100, progressPercent)
}
