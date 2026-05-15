/**
 * Progress Calculator — Расчет общего прогресса обучения
 *
 * Этапы обучения с весами:
 * 1. Документы (10%)
 * 2. Госпошлина (5%)
 * 3. Теория школы (15%)
 * 4. Теория ГИБДД (15%)
 * 5. Практика (25%) — для каждой категории
 * 6. Экзамен практики ГИБДД (25%) — для каждой категории
 * 7. Выдача прав (5%)
 */

import type {
  DocumentsStatus,
  ExamResult,
  ExamType,
  LicenseCategory,
  PracticeStatus,
  TheoryStatus,
} from '@letar/driving-school-db/prisma'

export interface OverallProgress {
  percentage: number // 0-100
  stages: ProgressStage[]
  currentStage: string
  completedStages: number
  totalStages: number
}

export interface ProgressStage {
  id: string
  name: string
  weight: number
  progress: number // 0-100 для этого этапа
  status: 'not_started' | 'in_progress' | 'completed'
  category?: LicenseCategory // Для этапов, специфичных для категории
}

/**
 * Интерфейс основного прогресса для расчета
 */
export interface StudentProgressForCalculation {
  documentsStatus: DocumentsStatus
  stateFeePaidAt: Date | null
  theoryStatus: TheoryStatus
  theoryAttendanceRate: number | null
  licenseIssuedAt: Date | null
}

/**
 * Интерфейс прогресса по категории для расчета
 */
export interface CategoryProgressForCalculation {
  id: string
  category: LicenseCategory
  practiceStatus: PracticeStatus
  lessonsCompleted: number
}

/**
 * Интерфейс записи на экзамен для расчета прогресса
 */
export interface ExamRegistrationForCalculation {
  categoryProgressId: string | null
  session: {
    type: ExamType
  }
  attempt: {
    result: ExamResult
  } | null
}

interface ProgressInput {
  progress: StudentProgressForCalculation
  categoryProgressList: CategoryProgressForCalculation[]
  examRegistrations: ExamRegistrationForCalculation[]
  courseLessonsTotal?: number // Общее количество занятий в курсе
}

const BASE_WEIGHTS = {
  documents: 10,
  stateFee: 5,
  schoolTheory: 15,
  gibddTheory: 15,
  // practice и gibddPractice делятся поровну между категориями
  practice: 25,
  gibddPractice: 25,
  license: 5,
}

/**
 * Рассчитывает общий прогресс обучения
 */
export function calculateOverallProgress(input: ProgressInput): OverallProgress {
  const { progress, categoryProgressList, examRegistrations, courseLessonsTotal = 20 } = input
  const stages: ProgressStage[] = []

  // 1. Документы (10%)
  const documentsProgress = getDocumentsProgress(progress.documentsStatus)
  stages.push({
    id: 'documents',
    name: 'Документы',
    weight: BASE_WEIGHTS.documents,
    progress: documentsProgress,
    status: documentsProgress === 100 ? 'completed' : documentsProgress > 0 ? 'in_progress' : 'not_started',
  })

  // 2. Госпошлина (5%)
  const stateFeeProgress = progress.stateFeePaidAt ? 100 : 0
  stages.push({
    id: 'stateFee',
    name: 'Госпошлина',
    weight: BASE_WEIGHTS.stateFee,
    progress: stateFeeProgress,
    status: stateFeeProgress === 100 ? 'completed' : 'not_started',
  })

  // 3. Теория школы (15%)
  const schoolTheoryProgress = getTheoryProgress(progress.theoryStatus, progress.theoryAttendanceRate)
  stages.push({
    id: 'schoolTheory',
    name: 'Теория (школа)',
    weight: BASE_WEIGHTS.schoolTheory,
    progress: schoolTheoryProgress,
    status: schoolTheoryProgress === 100 ? 'completed' : schoolTheoryProgress > 0 ? 'in_progress' : 'not_started',
  })

  // 4. Теория ГИБДД (15%)
  const gibddTheoryPassed = examRegistrations.some(
    (r) => r.session.type === 'GIBDD_THEORY' && r.attempt?.result === 'PASSED'
  )
  const gibddTheoryProgress = gibddTheoryPassed ? 100 : 0
  stages.push({
    id: 'gibddTheory',
    name: 'Теория ГИБДД',
    weight: BASE_WEIGHTS.gibddTheory,
    progress: gibddTheoryProgress,
    status: gibddTheoryProgress === 100 ? 'completed' : 'not_started',
  })

  // 5 & 6. Практика и ГИБДД практика для каждой категории
  const categoryCount = categoryProgressList.length || 1
  const practiceWeightPerCategory = BASE_WEIGHTS.practice / categoryCount
  const gibddPracticeWeightPerCategory = BASE_WEIGHTS.gibddPractice / categoryCount

  for (const cp of categoryProgressList) {
    // Практика для категории
    const practiceProgress = getPracticeProgress(cp.practiceStatus, cp.lessonsCompleted, courseLessonsTotal)
    stages.push({
      id: `practice_${cp.category}`,
      name: `Практика (${cp.category})`,
      weight: practiceWeightPerCategory,
      progress: practiceProgress,
      status: practiceProgress === 100 ? 'completed' : practiceProgress > 0 ? 'in_progress' : 'not_started',
      category: cp.category,
    })

    // ГИБДД практика для категории
    const categoryRegs = examRegistrations.filter((r) => r.categoryProgressId === cp.id)
    const areaPassed = categoryRegs.some(
      (r) => r.session.type === 'GIBDD_PRACTICE_AREA' && r.attempt?.result === 'PASSED'
    )
    const cityPassed = categoryRegs.some(
      (r) => r.session.type === 'GIBDD_PRACTICE_CITY' && r.attempt?.result === 'PASSED'
    )
    const gibddPracticeProgress = areaPassed && cityPassed ? 100 : areaPassed || cityPassed ? 50 : 0
    stages.push({
      id: `gibddPractice_${cp.category}`,
      name: `ГИБДД практика (${cp.category})`,
      weight: gibddPracticeWeightPerCategory,
      progress: gibddPracticeProgress,
      status: gibddPracticeProgress === 100 ? 'completed' : gibddPracticeProgress > 0 ? 'in_progress' : 'not_started',
      category: cp.category,
    })
  }

  // 7. Выдача прав (5%)
  const licenseProgress = progress.licenseIssuedAt ? 100 : 0
  stages.push({
    id: 'license',
    name: 'Выдача прав',
    weight: BASE_WEIGHTS.license,
    progress: licenseProgress,
    status: licenseProgress === 100 ? 'completed' : 'not_started',
  })

  // Расчет общего процента
  const totalWeight = stages.reduce((sum, s) => sum + s.weight, 0)
  const weightedProgress = stages.reduce((sum, s) => sum + (s.progress * s.weight) / 100, 0)
  const percentage = Math.round((weightedProgress / totalWeight) * 100)

  // Определение текущего этапа (первый незавершенный)
  const currentStageObj = stages.find((s) => s.status !== 'completed') || stages[stages.length - 1]
  const completedStages = stages.filter((s) => s.status === 'completed').length

  return {
    percentage,
    stages,
    currentStage: currentStageObj.name,
    completedStages,
    totalStages: stages.length,
  }
}

function getDocumentsProgress(status: DocumentsStatus): number {
  switch (status) {
    case 'NOT_STARTED':
      return 0
    case 'IN_PROGRESS':
      return 50
    case 'READY':
      return 100
    default:
      return 0
  }
}

function getTheoryProgress(status: TheoryStatus, attendanceRate: number | null): number {
  switch (status) {
    case 'NOT_STARTED':
      return 0
    case 'IN_PROGRESS':
      // Используем посещаемость как индикатор прогресса
      return attendanceRate ? Math.min(attendanceRate, 90) : 50
    case 'COMPLETED':
      return 100
    case 'FAILED':
      return 0 // Нужно пересдавать
    default:
      return 0
  }
}

function getPracticeProgress(status: PracticeStatus, lessonsCompleted: number, totalLessons: number): number {
  switch (status) {
    case 'NOT_STARTED':
      return 0
    case 'IN_PROGRESS':
      // Прогресс на основе количества пройденных занятий
      return Math.min(Math.round((lessonsCompleted / totalLessons) * 100), 99)
    case 'COMPLETED':
      return 100
    default:
      return 0
  }
}

/**
 * Генерирует текстовое описание текущего этапа
 */
export function getProgressDescription(progress: OverallProgress): string {
  if (progress.percentage === 100) {
    return 'Обучение завершено! Права выданы.'
  }

  if (progress.percentage === 0) {
    return 'Обучение не начато. Начните со сбора документов.'
  }

  const currentStage = progress.stages.find((s) => s.status === 'in_progress')
  if (currentStage) {
    return `Текущий этап: ${currentStage.name} (${currentStage.progress}%)`
  }

  const nextStage = progress.stages.find((s) => s.status === 'not_started')
  if (nextStage) {
    return `Следующий этап: ${nextStage.name}`
  }

  return `Прогресс: ${progress.percentage}%`
}

/**
 * Возвращает список следующих шагов для ученика
 */
export function getNextSteps(progress: OverallProgress): string[] {
  const steps: string[] = []

  for (const stage of progress.stages) {
    if (stage.status === 'not_started') {
      steps.push(`Начать: ${stage.name}`)
      break // Показываем только один следующий шаг
    } else if (stage.status === 'in_progress') {
      steps.push(`Завершить: ${stage.name} (${stage.progress}%)`)
      break
    }
  }

  return steps
}
