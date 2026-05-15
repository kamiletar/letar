/**
 * Сервис для работы с экзаменами
 *
 * Бизнес-логика:
 * - Типы экзаменов и их названия
 * - Расчёт статистики по экзаменам
 * - Валидация результатов
 */

// === Типы ===

export type ExamType =
  | 'INTERNAL_THEORY'
  | 'INTERNAL_PRACTICE'
  | 'GIBDD_THEORY'
  | 'GIBDD_PRACTICE_AREA'
  | 'GIBDD_PRACTICE_CITY'

export type ExamResult = 'PASSED' | 'FAILED' | 'NO_SHOW'

export type ExamSessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface ExamStats {
  totalRegistrations: number
  totalAttempts: number
  passed: number
  failed: number
  noShow: number
  passRate: number | null
  averageScore: number | null
}

export interface StudentExamHistory {
  totalAttempts: number
  passed: number
  failed: number
  noShow: number
  bestScore: number | null
  lastAttemptDate: Date | null
}

export interface ExamAttempt {
  result: ExamResult
  score: number | null
  gradedAt: Date | null
}

// === Константы ===

/**
 * Названия типов экзаменов на русском
 */
export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  INTERNAL_THEORY: 'Внутренний теоретический',
  INTERNAL_PRACTICE: 'Внутренний практический',
  GIBDD_THEORY: 'ГИБДД теория',
  GIBDD_PRACTICE_AREA: 'ГИБДД практика (площадка)',
  GIBDD_PRACTICE_CITY: 'ГИБДД практика (город)',
}

/**
 * Названия результатов экзаменов
 */
export const EXAM_RESULT_LABELS: Record<ExamResult, string> = {
  PASSED: 'Сдал',
  FAILED: 'Не сдал',
  NO_SHOW: 'Неявка',
}

/**
 * Минимальный проходной балл по умолчанию
 */
export const DEFAULT_PASSING_SCORE = 18

/**
 * Максимальный балл для теоретического экзамена
 */
export const MAX_THEORY_SCORE = 20

// === Функции ===

/**
 * Получение названия типа экзамена
 *
 * @param type - Тип экзамена
 * @returns Название на русском
 */
export function getExamTypeLabel(type: ExamType): string {
  return EXAM_TYPE_LABELS[type] ?? type
}

/**
 * Получение названия результата
 *
 * @param result - Результат экзамена
 * @returns Название на русском
 */
export function getExamResultLabel(result: ExamResult): string {
  return EXAM_RESULT_LABELS[result] ?? result
}

/**
 * Расчёт статистики по экзаменационной сессии
 *
 * @param attempts - Список попыток с результатами
 * @param totalRegistrations - Общее количество регистраций
 * @returns Статистика экзамена
 */
export function calculateExamStats(attempts: ExamAttempt[], totalRegistrations: number): ExamStats {
  const totalAttempts = attempts.length
  const passed = attempts.filter((a) => a.result === 'PASSED').length
  const failed = attempts.filter((a) => a.result === 'FAILED').length
  const noShow = attempts.filter((a) => a.result === 'NO_SHOW').length

  // Считаем passRate только по тем, кто явился (исключаем неявки)
  const actualAttempts = passed + failed
  const passRate = actualAttempts > 0 ? Math.round((passed / actualAttempts) * 100) : null

  // Средний балл только по сдававшим
  const scoresWithResults = attempts
    .filter((a) => a.result !== 'NO_SHOW' && a.score !== null)
    .map((a) => a.score as number)

  const averageScore =
    scoresWithResults.length > 0
      ? Math.round(scoresWithResults.reduce((sum, s) => sum + s, 0) / scoresWithResults.length)
      : null

  return {
    totalRegistrations,
    totalAttempts,
    passed,
    failed,
    noShow,
    passRate,
    averageScore,
  }
}

/**
 * Расчёт истории экзаменов студента
 *
 * @param attempts - Все попытки студента
 * @returns История экзаменов
 */
export function calculateStudentExamHistory(
  attempts: Array<{ result: ExamResult; score: number | null; gradedAt: Date | null }>
): StudentExamHistory {
  const totalAttempts = attempts.length
  const passed = attempts.filter((a) => a.result === 'PASSED').length
  const failed = attempts.filter((a) => a.result === 'FAILED').length
  const noShow = attempts.filter((a) => a.result === 'NO_SHOW').length

  const scores = attempts.filter((a) => a.score !== null).map((a) => a.score as number)

  const bestScore = scores.length > 0 ? Math.max(...scores) : null

  const dates = attempts
    .filter((a) => a.gradedAt !== null)
    .map((a) => a.gradedAt as Date)
    .sort((a, b) => b.getTime() - a.getTime())

  const lastAttemptDate = dates.length > 0 ? dates[0] : null

  return {
    totalAttempts,
    passed,
    failed,
    noShow,
    bestScore,
    lastAttemptDate,
  }
}

/**
 * Проверка, сдан ли экзамен по баллу
 *
 * @param score - Набранные баллы
 * @param passingScore - Проходной балл (по умолчанию 18)
 * @returns true если экзамен сдан
 */
export function isPassingScore(score: number, passingScore: number = DEFAULT_PASSING_SCORE): boolean {
  return score >= passingScore
}

/**
 * Определение результата по баллу
 *
 * @param score - Набранные баллы
 * @param passingScore - Проходной балл
 * @returns Результат: PASSED или FAILED
 */
export function getResultByScore(score: number, passingScore: number = DEFAULT_PASSING_SCORE): ExamResult {
  return isPassingScore(score, passingScore) ? 'PASSED' : 'FAILED'
}

/**
 * Проверка, можно ли изменить результат экзамена
 *
 * @param status - Статус экзаменационной сессии
 * @returns true если можно изменять результаты
 */
export function canModifyExamResults(status: ExamSessionStatus): boolean {
  return status === 'IN_PROGRESS' || status === 'COMPLETED'
}

/**
 * Проверка, можно ли регистрироваться на экзамен
 *
 * @param status - Статус экзаменационной сессии
 * @param currentRegistrations - Текущее количество регистраций
 * @param maxRegistrations - Максимальное количество регистраций
 * @returns true если регистрация возможна
 */
export function canRegisterForExam(
  status: ExamSessionStatus,
  currentRegistrations: number,
  maxRegistrations: number
): boolean {
  if (status !== 'SCHEDULED') {
    return false
  }
  return currentRegistrations < maxRegistrations
}

/**
 * Проверка, является ли экзамен теоретическим
 *
 * @param type - Тип экзамена
 * @returns true если теоретический
 */
export function isTheoryExam(type: ExamType): boolean {
  return type === 'INTERNAL_THEORY' || type === 'GIBDD_THEORY'
}

/**
 * Проверка, является ли экзамен внутренним
 *
 * @param type - Тип экзамена
 * @returns true если внутренний экзамен школы
 */
export function isInternalExam(type: ExamType): boolean {
  return type === 'INTERNAL_THEORY' || type === 'INTERNAL_PRACTICE'
}

/**
 * Проверка, является ли экзамен экзаменом ГИБДД
 *
 * @param type - Тип экзамена
 * @returns true если экзамен ГИБДД
 */
export function isGibddExam(type: ExamType): boolean {
  return !isInternalExam(type)
}

/**
 * Валидация балла экзамена
 *
 * @param score - Балл
 * @param type - Тип экзамена
 * @returns Объект с результатом валидации
 */
export function validateExamScore(score: number, type: ExamType): { valid: boolean; error?: string } {
  if (score < 0) {
    return { valid: false, error: 'Балл не может быть отрицательным' }
  }

  if (isTheoryExam(type) && score > MAX_THEORY_SCORE) {
    return { valid: false, error: `Максимальный балл для теоретического экзамена: ${MAX_THEORY_SCORE}` }
  }

  return { valid: true }
}
