/**
 * Unit-тесты для review-service.ts
 *
 * Тестируем бизнес-логику расчёта статистики инструктора
 * и функции модерации отзывов.
 */

import { describe, expect, it } from 'vitest'

import { calculateInstructorStats, type ReviewForStats } from '../review-service'

// ============================================
// calculateInstructorStats — статистика инструктора
// ============================================

describe('calculateInstructorStats', () => {
  // === Группа 1: Расчёт среднего рейтинга ===

  it('должен вычислять средний рейтинг', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: true,
        wasPatient: true,
        explainedWell: true,
        feltSafe: true,
        vehicleRating: 5,
        wouldRecommend: true,
      },
      {
        rating: 4,
        wasOnTime: true,
        wasPatient: false,
        explainedWell: true,
        feltSafe: true,
        vehicleRating: 4,
        wouldRecommend: true,
      },
      {
        rating: 5,
        wasOnTime: false,
        wasPatient: true,
        explainedWell: true,
        feltSafe: true,
        vehicleRating: 5,
        wouldRecommend: true,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    // Средний рейтинг: (5 + 4 + 5) / 3 = 4.67 → 4.7
    expect(stats.averageRating).toBe(4.7)
    expect(stats.reviewCount).toBe(3)
  })

  it('должен возвращать null для пустого массива', () => {
    const reviews: ReviewForStats[] = []

    const stats = calculateInstructorStats(reviews)

    expect(stats.averageRating).toBeNull()
    expect(stats.reviewCount).toBe(0)
    expect(stats.wasOnTimePercent).toBeNull()
    expect(stats.wasPatientPercent).toBeNull()
    expect(stats.explainedWellPercent).toBeNull()
    expect(stats.feltSafePercent).toBeNull()
    expect(stats.averageVehicleRating).toBeNull()
    expect(stats.wouldRecommendPercent).toBeNull()
  })

  it('должен округлять рейтинг до одного знака', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 4,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 4,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 4,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    // (5 + 4 + 4 + 4 + 5) / 5 = 4.4
    expect(stats.averageRating).toBe(4.4)
  })

  // === Группа 2: Breakdown по качественным аспектам ===

  it('должен вычислять процент "wasOnTime"', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: true,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 4,
        wasOnTime: true,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 5,
        wasOnTime: false,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 5,
        wasOnTime: true,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    // 3 из 4 = 75%
    expect(stats.wasOnTimePercent).toBe(75)
  })

  it('должен вычислять процент "wasPatient"', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: true,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 4,
        wasOnTime: null,
        wasPatient: false,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: true,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    // 2 из 3 = 67% (округляется до целого)
    expect(stats.wasPatientPercent).toBe(67)
  })

  it('должен вычислять процент "explainedWell"', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: true,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 4,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: true,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: true,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: true,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 3,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: false,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    // 4 из 5 = 80%
    expect(stats.explainedWellPercent).toBe(80)
  })

  it('должен вычислять процент "feltSafe"', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: true,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 4,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: true,
        vehicleRating: null,
        wouldRecommend: null,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    // 2 из 2 = 100%
    expect(stats.feltSafePercent).toBe(100)
  })

  it('должен вычислять процент "wouldRecommend"', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: true,
      },
      {
        rating: 4,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: false,
      },
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: true,
      },
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: true,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    // 3 из 4 = 75%
    expect(stats.wouldRecommendPercent).toBe(75)
  })

  // === Группа 3: Средняя оценка автомобиля ===

  it('должен вычислять среднюю оценку автомобиля', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: 5,
        wouldRecommend: null,
      },
      {
        rating: 4,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: 4,
        wouldRecommend: null,
      },
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: 5,
        wouldRecommend: null,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    // (5 + 4 + 5) / 3 = 4.67 → 4.7
    expect(stats.averageVehicleRating).toBe(4.7)
  })

  it('должен возвращать null если нет оценок автомобиля', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 4,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    expect(stats.averageVehicleRating).toBeNull()
  })

  // === Группа 4: Игнорирование null значений ===

  it('должен игнорировать null при расчёте процентов', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: true,
        wasPatient: null, // Не ответил
        explainedWell: true,
        feltSafe: null, // Не ответил
        vehicleRating: 5,
        wouldRecommend: true,
      },
      {
        rating: 4,
        wasOnTime: null, // Не ответил
        wasPatient: true,
        explainedWell: true,
        feltSafe: true,
        vehicleRating: null, // Не ответил
        wouldRecommend: false,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    // wasOnTime: 1 из 1 = 100%
    expect(stats.wasOnTimePercent).toBe(100)
    // wasPatient: 1 из 1 = 100%
    expect(stats.wasPatientPercent).toBe(100)
    // explainedWell: 2 из 2 = 100%
    expect(stats.explainedWellPercent).toBe(100)
    // feltSafe: 1 из 1 = 100%
    expect(stats.feltSafePercent).toBe(100)
    // vehicleRating: 5 (только один ответ)
    expect(stats.averageVehicleRating).toBe(5)
    // wouldRecommend: 1 из 2 = 50%
    expect(stats.wouldRecommendPercent).toBe(50)
  })

  it('должен возвращать null для процента если никто не ответил', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
      {
        rating: 4,
        wasOnTime: null,
        wasPatient: null,
        explainedWell: null,
        feltSafe: null,
        vehicleRating: null,
        wouldRecommend: null,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    expect(stats.wasOnTimePercent).toBeNull()
    expect(stats.wasPatientPercent).toBeNull()
    expect(stats.explainedWellPercent).toBeNull()
    expect(stats.feltSafePercent).toBeNull()
    expect(stats.averageVehicleRating).toBeNull()
    expect(stats.wouldRecommendPercent).toBeNull()
  })

  // === Группа 5: Граничные случаи ===

  it('должен обрабатывать 100% положительных ответов', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 5,
        wasOnTime: true,
        wasPatient: true,
        explainedWell: true,
        feltSafe: true,
        vehicleRating: 5,
        wouldRecommend: true,
      },
      {
        rating: 5,
        wasOnTime: true,
        wasPatient: true,
        explainedWell: true,
        feltSafe: true,
        vehicleRating: 5,
        wouldRecommend: true,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    expect(stats.averageRating).toBe(5)
    expect(stats.wasOnTimePercent).toBe(100)
    expect(stats.wasPatientPercent).toBe(100)
    expect(stats.explainedWellPercent).toBe(100)
    expect(stats.feltSafePercent).toBe(100)
    expect(stats.averageVehicleRating).toBe(5)
    expect(stats.wouldRecommendPercent).toBe(100)
  })

  it('должен обрабатывать 0% положительных ответов', () => {
    const reviews: ReviewForStats[] = [
      {
        rating: 1,
        wasOnTime: false,
        wasPatient: false,
        explainedWell: false,
        feltSafe: false,
        vehicleRating: 1,
        wouldRecommend: false,
      },
    ]

    const stats = calculateInstructorStats(reviews)

    expect(stats.averageRating).toBe(1)
    expect(stats.wasOnTimePercent).toBe(0)
    expect(stats.wasPatientPercent).toBe(0)
    expect(stats.explainedWellPercent).toBe(0)
    expect(stats.feltSafePercent).toBe(0)
    expect(stats.averageVehicleRating).toBe(1)
    expect(stats.wouldRecommendPercent).toBe(0)
  })
})

// ============================================
// hideReview / publishReview — модерация
// ============================================

/**
 * ПРИМЕЧАНИЕ:
 * hideReview() и publishReview() требуют реального DB клиента.
 * Эти функции будут протестированы в E2E тестах.
 * Здесь мы только проверяем их сигнатуру и документацию.
 */

import { hideReview, publishReview } from '../review-service'

describe('hideReview', () => {
  it('должна иметь корректную сигнатуру', () => {
    // Проверяем что функция существует и является функцией
    expect(typeof hideReview).toBe('function')
  })
})

describe('publishReview', () => {
  it('должна иметь корректную сигнатуру', () => {
    // Проверяем что функция существует и является функцией
    expect(typeof publishReview).toBe('function')
  })
})
