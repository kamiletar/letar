/**
 * Вспомогательные функции для работы с рейтингами
 */

import type { getEnhancedPrisma } from '@/lib/db'

/**
 * Пересчёт среднего рейтинга инструктора
 */
export async function updateInstructorRating(
  db: ReturnType<typeof getEnhancedPrisma>,
  instructorId: string
): Promise<void> {
  const stats = await db.review.aggregate({
    where: {
      instructorId,
      targetType: 'INSTRUCTOR',
      status: 'PUBLISHED',
    },
    _avg: { rating: true },
    _count: { id: true },
  })

  await db.instructorProfile.update({
    where: { id: instructorId },
    data: {
      averageRating: stats._avg.rating,
      reviewCount: stats._count.id,
    },
  })
}

/**
 * Пересчёт среднего рейтинга школы
 */
export async function updateSchoolRating(
  db: ReturnType<typeof getEnhancedPrisma>,
  organizationId: string
): Promise<void> {
  const stats = await db.review.aggregate({
    where: {
      organizationId,
      targetType: 'SCHOOL',
      status: 'PUBLISHED',
    },
    _avg: { rating: true },
    _count: { id: true },
  })

  await db.organization.update({
    where: { id: organizationId },
    data: {
      averageRating: stats._avg.rating,
      reviewCount: stats._count.id,
    },
  })
}
