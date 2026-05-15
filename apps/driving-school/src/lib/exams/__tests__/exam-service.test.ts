/**
 * Тесты для сервиса экзаменов
 */
// globals: true — describe, expect, it доступны глобально

import {
  calculateExamStats,
  calculateStudentExamHistory,
  canModifyExamResults,
  canRegisterForExam,
  DEFAULT_PASSING_SCORE,
  EXAM_RESULT_LABELS,
  EXAM_TYPE_LABELS,
  type ExamAttempt,
  type ExamResult,
  type ExamType,
  getExamResultLabel,
  getExamTypeLabel,
  getResultByScore,
  isGibddExam,
  isInternalExam,
  isPassingScore,
  isTheoryExam,
  MAX_THEORY_SCORE,
  validateExamScore,
} from '../exam-service'

// ============================================
// Константы
// ============================================

describe('Константы', () => {
  it('DEFAULT_PASSING_SCORE должен быть 18', () => {
    expect(DEFAULT_PASSING_SCORE).toBe(18)
  })

  it('MAX_THEORY_SCORE должен быть 20', () => {
    expect(MAX_THEORY_SCORE).toBe(20)
  })

  it('EXAM_TYPE_LABELS должен содержать все типы экзаменов', () => {
    expect(EXAM_TYPE_LABELS.INTERNAL_THEORY).toBe('Внутренний теоретический')
    expect(EXAM_TYPE_LABELS.INTERNAL_PRACTICE).toBe('Внутренний практический')
    expect(EXAM_TYPE_LABELS.GIBDD_THEORY).toBe('ГИБДД теория')
    expect(EXAM_TYPE_LABELS.GIBDD_PRACTICE_AREA).toBe('ГИБДД практика (площадка)')
    expect(EXAM_TYPE_LABELS.GIBDD_PRACTICE_CITY).toBe('ГИБДД практика (город)')
  })

  it('EXAM_RESULT_LABELS должен содержать все результаты', () => {
    expect(EXAM_RESULT_LABELS.PASSED).toBe('Сдал')
    expect(EXAM_RESULT_LABELS.FAILED).toBe('Не сдал')
    expect(EXAM_RESULT_LABELS.NO_SHOW).toBe('Неявка')
  })
})

// ============================================
// getExamTypeLabel
// ============================================

describe('getExamTypeLabel', () => {
  it('должен возвращать название для INTERNAL_THEORY', () => {
    expect(getExamTypeLabel('INTERNAL_THEORY')).toBe('Внутренний теоретический')
  })

  it('должен возвращать название для GIBDD_PRACTICE_CITY', () => {
    expect(getExamTypeLabel('GIBDD_PRACTICE_CITY')).toBe('ГИБДД практика (город)')
  })

  it('должен возвращать исходное значение для неизвестного типа', () => {
    expect(getExamTypeLabel('UNKNOWN' as ExamType)).toBe('UNKNOWN')
  })
})

// ============================================
// getExamResultLabel
// ============================================

describe('getExamResultLabel', () => {
  it('должен возвращать "Сдал" для PASSED', () => {
    expect(getExamResultLabel('PASSED')).toBe('Сдал')
  })

  it('должен возвращать "Не сдал" для FAILED', () => {
    expect(getExamResultLabel('FAILED')).toBe('Не сдал')
  })

  it('должен возвращать "Неявка" для NO_SHOW', () => {
    expect(getExamResultLabel('NO_SHOW')).toBe('Неявка')
  })

  it('должен возвращать исходное значение для неизвестного результата', () => {
    expect(getExamResultLabel('UNKNOWN' as ExamResult)).toBe('UNKNOWN')
  })
})

// ============================================
// calculateExamStats
// ============================================

describe('calculateExamStats', () => {
  it('должен возвращать пустую статистику для пустого списка', () => {
    const result = calculateExamStats([], 0)

    expect(result.totalRegistrations).toBe(0)
    expect(result.totalAttempts).toBe(0)
    expect(result.passed).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.noShow).toBe(0)
    expect(result.passRate).toBeNull()
    expect(result.averageScore).toBeNull()
  })

  it('должен корректно считать статистику по попыткам', () => {
    const attempts: ExamAttempt[] = [
      { result: 'PASSED', score: 19, gradedAt: new Date() },
      { result: 'PASSED', score: 20, gradedAt: new Date() },
      { result: 'FAILED', score: 15, gradedAt: new Date() },
      { result: 'NO_SHOW', score: null, gradedAt: null },
    ]

    const result = calculateExamStats(attempts, 5)

    expect(result.totalRegistrations).toBe(5)
    expect(result.totalAttempts).toBe(4)
    expect(result.passed).toBe(2)
    expect(result.failed).toBe(1)
    expect(result.noShow).toBe(1)
  })

  it('должен считать passRate только по явившимся', () => {
    const attempts: ExamAttempt[] = [
      { result: 'PASSED', score: 19, gradedAt: new Date() },
      { result: 'FAILED', score: 15, gradedAt: new Date() },
      { result: 'NO_SHOW', score: null, gradedAt: null },
    ]

    const result = calculateExamStats(attempts, 3)

    // 1 сдал из 2 явившихся = 50%
    expect(result.passRate).toBe(50)
  })

  it('должен считать средний балл только по сдававшим', () => {
    const attempts: ExamAttempt[] = [
      { result: 'PASSED', score: 20, gradedAt: new Date() },
      { result: 'FAILED', score: 10, gradedAt: new Date() },
      { result: 'NO_SHOW', score: null, gradedAt: null },
    ]

    const result = calculateExamStats(attempts, 3)

    // (20 + 10) / 2 = 15
    expect(result.averageScore).toBe(15)
  })

  it('должен возвращать 100% passRate при всех сдавших', () => {
    const attempts: ExamAttempt[] = [
      { result: 'PASSED', score: 18, gradedAt: new Date() },
      { result: 'PASSED', score: 19, gradedAt: new Date() },
    ]

    const result = calculateExamStats(attempts, 2)

    expect(result.passRate).toBe(100)
  })
})

// ============================================
// calculateStudentExamHistory
// ============================================

describe('calculateStudentExamHistory', () => {
  it('должен возвращать пустую историю для пустого списка', () => {
    const result = calculateStudentExamHistory([])

    expect(result.totalAttempts).toBe(0)
    expect(result.passed).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.noShow).toBe(0)
    expect(result.bestScore).toBeNull()
    expect(result.lastAttemptDate).toBeNull()
  })

  it('должен корректно считать статистику студента', () => {
    const attempts = [
      { result: 'PASSED' as ExamResult, score: 19, gradedAt: new Date('2024-01-15') },
      { result: 'FAILED' as ExamResult, score: 15, gradedAt: new Date('2024-01-10') },
      { result: 'NO_SHOW' as ExamResult, score: null, gradedAt: null },
    ]

    const result = calculateStudentExamHistory(attempts)

    expect(result.totalAttempts).toBe(3)
    expect(result.passed).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.noShow).toBe(1)
  })

  it('должен находить лучший балл', () => {
    const attempts = [
      { result: 'PASSED' as ExamResult, score: 19, gradedAt: new Date() },
      { result: 'FAILED' as ExamResult, score: 15, gradedAt: new Date() },
      { result: 'PASSED' as ExamResult, score: 20, gradedAt: new Date() },
    ]

    const result = calculateStudentExamHistory(attempts)

    expect(result.bestScore).toBe(20)
  })

  it('должен находить дату последней попытки', () => {
    const lastDate = new Date('2024-02-01')
    const attempts = [
      { result: 'FAILED' as ExamResult, score: 15, gradedAt: new Date('2024-01-10') },
      { result: 'PASSED' as ExamResult, score: 19, gradedAt: lastDate },
      { result: 'FAILED' as ExamResult, score: 16, gradedAt: new Date('2024-01-20') },
    ]

    const result = calculateStudentExamHistory(attempts)

    expect(result.lastAttemptDate).toEqual(lastDate)
  })
})

// ============================================
// isPassingScore
// ============================================

describe('isPassingScore', () => {
  it('должен возвращать true для балла равного проходному', () => {
    expect(isPassingScore(18)).toBe(true)
  })

  it('должен возвращать true для балла выше проходного', () => {
    expect(isPassingScore(20)).toBe(true)
  })

  it('должен возвращать false для балла ниже проходного', () => {
    expect(isPassingScore(17)).toBe(false)
  })

  it('должен использовать кастомный проходной балл', () => {
    expect(isPassingScore(15, 15)).toBe(true)
    expect(isPassingScore(14, 15)).toBe(false)
  })
})

// ============================================
// getResultByScore
// ============================================

describe('getResultByScore', () => {
  it('должен возвращать PASSED для проходного балла', () => {
    expect(getResultByScore(18)).toBe('PASSED')
    expect(getResultByScore(20)).toBe('PASSED')
  })

  it('должен возвращать FAILED для непроходного балла', () => {
    expect(getResultByScore(17)).toBe('FAILED')
    expect(getResultByScore(0)).toBe('FAILED')
  })

  it('должен использовать кастомный проходной балл', () => {
    expect(getResultByScore(10, 10)).toBe('PASSED')
    expect(getResultByScore(9, 10)).toBe('FAILED')
  })
})

// ============================================
// canModifyExamResults
// ============================================

describe('canModifyExamResults', () => {
  it('должен разрешать изменение для IN_PROGRESS', () => {
    expect(canModifyExamResults('IN_PROGRESS')).toBe(true)
  })

  it('должен разрешать изменение для COMPLETED', () => {
    expect(canModifyExamResults('COMPLETED')).toBe(true)
  })

  it('должен запрещать изменение для SCHEDULED', () => {
    expect(canModifyExamResults('SCHEDULED')).toBe(false)
  })

  it('должен запрещать изменение для CANCELLED', () => {
    expect(canModifyExamResults('CANCELLED')).toBe(false)
  })
})

// ============================================
// canRegisterForExam
// ============================================

describe('canRegisterForExam', () => {
  it('должен разрешать регистрацию при наличии мест', () => {
    expect(canRegisterForExam('SCHEDULED', 5, 10)).toBe(true)
  })

  it('должен запрещать регистрацию при заполненной группе', () => {
    expect(canRegisterForExam('SCHEDULED', 10, 10)).toBe(false)
  })

  it('должен запрещать регистрацию для IN_PROGRESS', () => {
    expect(canRegisterForExam('IN_PROGRESS', 5, 10)).toBe(false)
  })

  it('должен запрещать регистрацию для COMPLETED', () => {
    expect(canRegisterForExam('COMPLETED', 5, 10)).toBe(false)
  })

  it('должен запрещать регистрацию для CANCELLED', () => {
    expect(canRegisterForExam('CANCELLED', 5, 10)).toBe(false)
  })
})

// ============================================
// isTheoryExam, isInternalExam, isGibddExam
// ============================================

describe('isTheoryExam', () => {
  it('должен возвращать true для INTERNAL_THEORY', () => {
    expect(isTheoryExam('INTERNAL_THEORY')).toBe(true)
  })

  it('должен возвращать true для GIBDD_THEORY', () => {
    expect(isTheoryExam('GIBDD_THEORY')).toBe(true)
  })

  it('должен возвращать false для практических экзаменов', () => {
    expect(isTheoryExam('INTERNAL_PRACTICE')).toBe(false)
    expect(isTheoryExam('GIBDD_PRACTICE_AREA')).toBe(false)
    expect(isTheoryExam('GIBDD_PRACTICE_CITY')).toBe(false)
  })
})

describe('isInternalExam', () => {
  it('должен возвращать true для внутренних экзаменов', () => {
    expect(isInternalExam('INTERNAL_THEORY')).toBe(true)
    expect(isInternalExam('INTERNAL_PRACTICE')).toBe(true)
  })

  it('должен возвращать false для экзаменов ГИБДД', () => {
    expect(isInternalExam('GIBDD_THEORY')).toBe(false)
    expect(isInternalExam('GIBDD_PRACTICE_AREA')).toBe(false)
    expect(isInternalExam('GIBDD_PRACTICE_CITY')).toBe(false)
  })
})

describe('isGibddExam', () => {
  it('должен возвращать true для экзаменов ГИБДД', () => {
    expect(isGibddExam('GIBDD_THEORY')).toBe(true)
    expect(isGibddExam('GIBDD_PRACTICE_AREA')).toBe(true)
    expect(isGibddExam('GIBDD_PRACTICE_CITY')).toBe(true)
  })

  it('должен возвращать false для внутренних экзаменов', () => {
    expect(isGibddExam('INTERNAL_THEORY')).toBe(false)
    expect(isGibddExam('INTERNAL_PRACTICE')).toBe(false)
  })
})

// ============================================
// validateExamScore
// ============================================

describe('validateExamScore', () => {
  it('должен возвращать valid: true для корректного балла', () => {
    const result = validateExamScore(18, 'INTERNAL_THEORY')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('должен возвращать ошибку для отрицательного балла', () => {
    const result = validateExamScore(-1, 'INTERNAL_THEORY')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Балл не может быть отрицательным')
  })

  it('должен возвращать ошибку для превышения максимума теоретического экзамена', () => {
    const result = validateExamScore(21, 'INTERNAL_THEORY')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Максимальный балл для теоретического экзамена: 20')
  })

  it('должен разрешать балл 20 для теоретического экзамена', () => {
    const result = validateExamScore(20, 'GIBDD_THEORY')
    expect(result.valid).toBe(true)
  })

  it('должен разрешать высокий балл для практического экзамена', () => {
    const result = validateExamScore(100, 'INTERNAL_PRACTICE')
    expect(result.valid).toBe(true)
  })

  it('должен возвращать ошибку для отрицательного балла практического экзамена', () => {
    const result = validateExamScore(-5, 'GIBDD_PRACTICE_CITY')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Балл не может быть отрицательным')
  })
})
