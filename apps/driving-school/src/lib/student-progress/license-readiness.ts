/**
 * License Readiness — Проверка готовности к выдаче прав
 *
 * Правила:
 * - ВСЕ категории в прогрессе должны быть успешно сданы
 * - Теория ГИБДД действительна (не истекла)
 * - Практика ГИБДД сдана по всем категориям
 */

import type {
  ApprovalStatus,
  DocumentsStatus,
  LicenseCategory,
  PracticeStatus,
  ProgressStatus,
  TheoryStatus,
} from '@letar/driving-school-db/prisma'

import type { ExamRegistrationWithSession } from './theory-validation'
import { findGibddTheoryPassedDate, isGibddTheoryValid } from './theory-validation'

export interface LicenseReadiness {
  isReady: boolean
  reasons: LicenseNotReadyReason[]
  categories: CategoryLicenseReadiness[]
  overallStatus: {
    documentsReady: boolean
    stateFeePaid: boolean
    theoryCompleted: boolean
    gibddTheoryPassed: boolean
    gibddTheoryValid: boolean
    allCategoriesPassed: boolean
  }
}

export interface CategoryLicenseReadiness {
  category: LicenseCategory
  isReady: boolean
  practiceCompleted: boolean
  instructorApproved: boolean
  gibddPracticePassed: boolean
  passedAt: Date | null
}

export type LicenseNotReadyReason =
  | 'PROGRESS_NOT_ACTIVE'
  | 'DOCUMENTS_NOT_READY'
  | 'STATE_FEE_NOT_PAID'
  | 'THEORY_NOT_COMPLETED'
  | 'GIBDD_THEORY_NOT_PASSED'
  | 'GIBDD_THEORY_EXPIRED'
  | 'CATEGORY_PRACTICE_NOT_COMPLETED'
  | 'CATEGORY_INSTRUCTOR_NOT_APPROVED'
  | 'CATEGORY_GIBDD_PRACTICE_NOT_PASSED'
  | 'NO_CATEGORIES'

/**
 * Интерфейс основного прогресса для проверки готовности
 */
export interface StudentProgressForLicense {
  status: ProgressStatus
  documentsStatus: DocumentsStatus
  stateFeePaidAt: Date | null
  theoryStatus: TheoryStatus
}

/**
 * Интерфейс прогресса по категории для проверки готовности
 */
export interface CategoryProgressForLicense {
  id: string
  category: LicenseCategory
  practiceStatus: PracticeStatus
  instructorApprovalStatus: ApprovalStatus
}

/**
 * Интерфейс записи на экзамен для проверки готовности
 */
export interface ExamRegistrationForLicense extends ExamRegistrationWithSession {
  categoryProgressId: string | null
}

/**
 * Полная проверка готовности к выдаче прав
 *
 * @param progress Основной прогресс ученика
 * @param categoryProgressList Прогресс по категориям
 * @param examRegistrations Записи на экзамены с попытками
 */
export function checkLicenseReadiness(
  progress: StudentProgressForLicense,
  categoryProgressList: CategoryProgressForLicense[],
  examRegistrations: ExamRegistrationForLicense[],
  referenceDate = new Date()
): LicenseReadiness {
  const reasons: LicenseNotReadyReason[] = []

  // Проверка статуса прогресса
  if (progress.status !== 'ACTIVE') {
    reasons.push('PROGRESS_NOT_ACTIVE')
  }

  // Проверка документов
  const documentsReady = progress.documentsStatus === 'READY'
  if (!documentsReady) {
    reasons.push('DOCUMENTS_NOT_READY')
  }

  // Проверка госпошлины
  const stateFeePaid = !!progress.stateFeePaidAt
  if (!stateFeePaid) {
    reasons.push('STATE_FEE_NOT_PAID')
  }

  // Проверка теории школы
  const theoryCompleted = progress.theoryStatus === 'COMPLETED'
  if (!theoryCompleted) {
    reasons.push('THEORY_NOT_COMPLETED')
  }

  // Проверка теории ГИБДД
  const gibddTheoryRegistrations = examRegistrations.filter((r) => r.session.type === 'GIBDD_THEORY')
  const gibddTheoryPassedDate = findGibddTheoryPassedDate(gibddTheoryRegistrations)
  const gibddTheoryPassed = !!gibddTheoryPassedDate
  const gibddTheoryValid = isGibddTheoryValid(gibddTheoryPassedDate, referenceDate)

  if (!gibddTheoryPassed) {
    reasons.push('GIBDD_THEORY_NOT_PASSED')
  } else if (!gibddTheoryValid) {
    reasons.push('GIBDD_THEORY_EXPIRED')
  }

  // Проверка категорий
  if (categoryProgressList.length === 0) {
    reasons.push('NO_CATEGORIES')
  }

  const categories: CategoryLicenseReadiness[] = categoryProgressList.map((cp) => {
    const practiceCompleted = cp.practiceStatus === 'COMPLETED'
    const instructorApproved = cp.instructorApprovalStatus === 'APPROVED'

    // Находим записи на практику ГИБДД для этой категории
    const categoryPracticeRegs = examRegistrations.filter(
      (r) =>
        r.categoryProgressId === cp.id &&
        (r.session.type === 'GIBDD_PRACTICE_AREA' || r.session.type === 'GIBDD_PRACTICE_CITY')
    )

    // Проверяем, сдана ли практика ГИБДД
    let gibddPracticePassed = false
    let passedAt: Date | null = null

    // Для полной сдачи нужны оба экзамена: площадка и город
    const areaPass = categoryPracticeRegs.find(
      (r) => r.session.type === 'GIBDD_PRACTICE_AREA' && r.attempt?.result === 'PASSED'
    )
    const cityPass = categoryPracticeRegs.find(
      (r) => r.session.type === 'GIBDD_PRACTICE_CITY' && r.attempt?.result === 'PASSED'
    )

    if (areaPass && cityPass) {
      gibddPracticePassed = true
      // Дата — последний успешный экзамен
      const areaPassedAt = areaPass.attempt?.gradedAt ?? areaPass.attempt?.createdAt
      const cityPassedAt = cityPass.attempt?.gradedAt ?? cityPass.attempt?.createdAt
      if (areaPassedAt && cityPassedAt) {
        passedAt = new Date(areaPassedAt) > new Date(cityPassedAt) ? new Date(areaPassedAt) : new Date(cityPassedAt)
      }
    }

    // Добавляем причины если категория не готова
    if (!practiceCompleted) {
      if (!reasons.includes('CATEGORY_PRACTICE_NOT_COMPLETED')) {
        reasons.push('CATEGORY_PRACTICE_NOT_COMPLETED')
      }
    }
    if (!instructorApproved) {
      if (!reasons.includes('CATEGORY_INSTRUCTOR_NOT_APPROVED')) {
        reasons.push('CATEGORY_INSTRUCTOR_NOT_APPROVED')
      }
    }
    if (!gibddPracticePassed) {
      if (!reasons.includes('CATEGORY_GIBDD_PRACTICE_NOT_PASSED')) {
        reasons.push('CATEGORY_GIBDD_PRACTICE_NOT_PASSED')
      }
    }

    return {
      category: cp.category,
      isReady: practiceCompleted && instructorApproved && gibddPracticePassed,
      practiceCompleted,
      instructorApproved,
      gibddPracticePassed,
      passedAt,
    }
  })

  const allCategoriesPassed = categories.length > 0 && categories.every((c) => c.isReady)

  return {
    isReady: reasons.length === 0,
    reasons,
    categories,
    overallStatus: {
      documentsReady,
      stateFeePaid,
      theoryCompleted,
      gibddTheoryPassed,
      gibddTheoryValid,
      allCategoriesPassed,
    },
  }
}

/**
 * Проверяет возможность частичной выдачи прав (только сданные категории)
 *
 * @returns Список категорий, готовых к выдаче
 */
export function getReadyCategories(readiness: LicenseReadiness): CategoryLicenseReadiness[] {
  // Для частичной выдачи требуется:
  // - Документы готовы
  // - Госпошлина оплачена
  // - Теория ГИБДД сдана и действительна
  const canIssuePartial =
    readiness.overallStatus.documentsReady &&
    readiness.overallStatus.stateFeePaid &&
    readiness.overallStatus.gibddTheoryPassed &&
    readiness.overallStatus.gibddTheoryValid

  if (!canIssuePartial) {
    return []
  }

  return readiness.categories.filter((c) => c.isReady)
}

/**
 * Проверяет, есть ли несданные категории для частичной выдачи
 */
export function hasUnfinishedCategories(readiness: LicenseReadiness): boolean {
  return readiness.categories.some((c) => !c.isReady)
}
