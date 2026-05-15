'use server'

/**
 * Server Actions для аналитики инструкторов.
 *
 * Предоставляет данные для страницы аналитики:
 * - KPI карточки (средний рейтинг, количество отзывов)
 * - Качественные аспекты (пунктуальность, терпеливость и т.д.)
 * - Статистика занятий (всего, завершено, отмена)
 * - Лидерборд инструкторов
 */

import { requireAuth } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'

// === Типы ===

export interface InstructorAnalyticsData {
  /** ID инструктора */
  id: string
  /** ID пользователя */
  userId: string
  /** Имя инструктора */
  name: string
  /** Фото */
  image: string | null
  /** Телефон */
  phone: string | null

  // === Рейтинг ===
  /** Средний рейтинг (1.0-5.0) */
  averageRating: number | null
  /** Количество отзывов */
  reviewCount: number

  // === Качественные аспекты (%) ===
  /** Процент отзывов с wasOnTime = true */
  onTimeRate: number | null
  /** Процент отзывов с wasPatient = true */
  patienceRate: number | null
  /** Процент отзывов с explainedWell = true */
  explanationRate: number | null
  /** Процент отзывов с feltSafe = true */
  safetyRate: number | null
  /** Процент отзывов с wouldRecommend = true */
  recommendRate: number | null
  /** Средняя оценка автомобиля (1.0-5.0) */
  avgVehicleRating: number | null

  // === Статистика занятий ===
  /** Всего занятий */
  totalLessons: number
  /** Завершённых занятий */
  completedLessons: number
  /** Отменённых занятий */
  cancelledLessons: number
  /** Процент завершённых занятий */
  completionRate: number

  // === Ученики ===
  /** Активных учеников */
  activeStudents: number
}

export interface InstructorAnalyticsSummary {
  /** Всего инструкторов */
  totalInstructors: number
  /** Средний рейтинг по школе */
  avgSchoolRating: number | null
  /** Всего отзывов */
  totalReviews: number
  /** Средний процент рекомендаций */
  avgRecommendRate: number | null
  /** Средний показатель завершения занятий */
  avgCompletionRate: number | null
}

export type GetInstructorAnalyticsResult =
  | {
      success: true
      data: {
        instructors: InstructorAnalyticsData[]
        summary: InstructorAnalyticsSummary
      }
    }
  | {
      success: false
      error: string
    }

// === Основная функция ===

/**
 * Получить аналитику по инструкторам школы.
 *
 * @param schoolId - ID организации
 */
export async function getInstructorAnalyticsAction(schoolId: string): Promise<GetInstructorAnalyticsResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    // Проверяем доступ к школе (owner/manager)
    const membership = await db.member.findFirst({
      where: {
        organizationId: schoolId,
        userId: user.id,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
    })

    if (!membership) {
      return { success: false, error: 'Нет доступа к аналитике этой школы' }
    }

    // Получаем всех инструкторов школы с их данными
    const instructorMembers = await db.member.findMany({
      where: {
        organizationId: schoolId,
        role: 'instructor',
      },
      include: {
        user: {
          include: {
            instructorProfile: {
              include: {
                reviews: {
                  where: {
                    status: 'PUBLISHED',
                  },
                  select: {
                    rating: true,
                    wasOnTime: true,
                    wasPatient: true,
                    explainedWell: true,
                    feltSafe: true,
                    vehicleRating: true,
                    wouldRecommend: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    // Получаем progressIds для фильтрации занятий по школе
    const progressIds = await db.studentProgress
      .findMany({
        where: { organizationId: schoolId },
        select: { id: true },
      })
      .then((p) => p.map((x) => x.id))

    // Загружаем ВСЕ занятия для всех инструкторов одним запросом (вместо N+1)
    const instructorUserIds = instructorMembers.map((m) => m.user.id)
    const allLessons = await db.lesson.findMany({
      where: {
        instructorId: { in: instructorUserIds },
        courseEnrollment: {
          progressId: { in: progressIds },
        },
      },
      select: {
        instructorId: true,
        status: true,
        studentId: true,
        slot: {
          select: { startTime: true },
        },
      },
    })

    // Группируем занятия по инструктору
    const lessonsByInstructor = new Map<string, typeof allLessons>()
    for (const lesson of allLessons) {
      const existing = lessonsByInstructor.get(lesson.instructorId)
      if (existing) {
        existing.push(lesson)
      } else {
        lessonsByInstructor.set(lesson.instructorId, [lesson])
      }
    }

    // Собираем аналитику для каждого инструктора (без дополнительных запросов)
    const instructorsData: InstructorAnalyticsData[] = instructorMembers.map((member) => {
      const {
        user: instructorUser,
        user: { instructorProfile },
      } = member

      const lessons = lessonsByInstructor.get(instructorUser.id) ?? []

      const totalLessons = lessons.length
      const completedLessons = lessons.filter((l) => l.status === 'COMPLETED').length
      const cancelledLessons = lessons.filter((l) => l.status === 'CANCELLED').length

      // Активные ученики (уникальные за последние 30 дней)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const activeStudentIds = new Set(
        lessons
          .filter((l) => l.status === 'COMPLETED' && l.slot && l.slot.startTime >= thirtyDaysAgo)
          .map((l) => l.studentId)
      )
      const activeStudents = activeStudentIds.size

      // Вычисляем качественные аспекты из отзывов
      const reviews = instructorProfile?.reviews ?? []

      const calculateRate = (field: keyof (typeof reviews)[0]): number | null => {
        const validReviews = reviews.filter((r) => r[field] !== null)
        if (validReviews.length === 0) {
          return null
        }
        const positiveCount = validReviews.filter((r) => r[field] === true).length
        return Math.round((positiveCount / validReviews.length) * 100)
      }

      const vehicleRatings = reviews.filter((r) => r.vehicleRating !== null).map((r) => r.vehicleRating as number)
      const avgVehicleRating =
        vehicleRatings.length > 0
          ? Math.round((vehicleRatings.reduce((a, b) => a + b, 0) / vehicleRatings.length) * 10) / 10
          : null

      return {
        id: instructorProfile?.id ?? '',
        userId: instructorUser.id,
        name: instructorUser.name ?? 'Без имени',
        image: instructorUser.image,
        phone: instructorUser.phone,

        // Рейтинг
        averageRating: instructorProfile?.averageRating ?? null,
        reviewCount: instructorProfile?.reviewCount ?? 0,

        // Качественные аспекты
        onTimeRate: calculateRate('wasOnTime'),
        patienceRate: calculateRate('wasPatient'),
        explanationRate: calculateRate('explainedWell'),
        safetyRate: calculateRate('feltSafe'),
        recommendRate: calculateRate('wouldRecommend'),
        avgVehicleRating,

        // Статистика занятий
        totalLessons,
        completedLessons,
        cancelledLessons,
        completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,

        // Ученики
        activeStudents,
      }
    })

    // Вычисляем сводку
    const instructorsWithRating = instructorsData.filter((i) => i.averageRating !== null)
    const avgSchoolRating =
      instructorsWithRating.length > 0
        ? Math.round(
            (instructorsWithRating.reduce((sum, i) => sum + (i.averageRating ?? 0), 0) / instructorsWithRating.length) *
              10
          ) / 10
        : null

    const instructorsWithRecommend = instructorsData.filter((i) => i.recommendRate !== null)
    const avgRecommendRate =
      instructorsWithRecommend.length > 0
        ? Math.round(
            instructorsWithRecommend.reduce((sum, i) => sum + (i.recommendRate ?? 0), 0) /
              instructorsWithRecommend.length
          )
        : null

    const instructorsWithLessons = instructorsData.filter((i) => i.totalLessons > 0)
    const avgCompletionRate =
      instructorsWithLessons.length > 0
        ? Math.round(
            instructorsWithLessons.reduce((sum, i) => sum + i.completionRate, 0) / instructorsWithLessons.length
          )
        : null

    const summary: InstructorAnalyticsSummary = {
      totalInstructors: instructorsData.length,
      avgSchoolRating,
      totalReviews: instructorsData.reduce((sum, i) => sum + i.reviewCount, 0),
      avgRecommendRate,
      avgCompletionRate,
    }

    return {
      success: true,
      data: {
        instructors: instructorsData,
        summary,
      },
    }
  } catch (error) {
    console.error('Ошибка получения аналитики инструкторов:', error)
    return { success: false, error: 'Произошла ошибка при загрузке аналитики' }
  }
}

// === Вспомогательные функции ===

export interface InstructorLeaderboardEntry {
  id: string
  name: string
  image: string | null
  averageRating: number | null
  reviewCount: number
  recommendRate: number | null
  completionRate: number
}

export type GetInstructorLeaderboardResult =
  | {
      success: true
      data: InstructorLeaderboardEntry[]
    }
  | {
      success: false
      error: string
    }

/**
 * Получить лидерборд инструкторов (топ по рейтингу).
 *
 * @param schoolId - ID организации
 * @param limit - Максимальное количество записей
 */
export async function getInstructorLeaderboardAction(
  schoolId: string,
  limit = 5
): Promise<GetInstructorLeaderboardResult> {
  const result = await getInstructorAnalyticsAction(schoolId)

  if (!result.success) {
    return result
  }

  // Сортируем по рейтингу (null в конце), затем по количеству отзывов
  const sorted = result.data.instructors
    .sort((a, b) => {
      if (a.averageRating === null && b.averageRating === null) {
        return b.reviewCount - a.reviewCount
      }
      if (a.averageRating === null) {
        return 1
      }
      if (b.averageRating === null) {
        return -1
      }
      if (a.averageRating !== b.averageRating) {
        return b.averageRating - a.averageRating
      }
      return b.reviewCount - a.reviewCount
    })
    .slice(0, limit)
    .map((i) => ({
      id: i.id,
      name: i.name,
      image: i.image,
      averageRating: i.averageRating,
      reviewCount: i.reviewCount,
      recommendRate: i.recommendRate,
      completionRate: i.completionRate,
    }))

  return { success: true, data: sorted }
}
