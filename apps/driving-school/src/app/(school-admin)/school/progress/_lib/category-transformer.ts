import type { ApprovalStatus, LicenseCategory, PracticeStatus, TransmissionType } from '@letar/driving-school-db/prisma'

/**
 * Результат трансформации категории прогресса
 */
export interface CategoryProgressSummary {
  id: string
  category: LicenseCategory
  transmissionRestriction: TransmissionType | null
  practiceStatus: PracticeStatus
  lessonsCompleted: number
  lessonsTotal: number
  instructorApprovalStatus: ApprovalStatus
  instructor: { id: string; name: string } | null
}

/**
 * Входные данные категории из Prisma include
 * courseEnrollments опционален — для списка не загружаем (экономия памяти),
 * в этом случае lessonsTotal будет 0
 */
export interface CategoryProgressInput {
  id: string
  category: LicenseCategory
  transmissionRestriction: TransmissionType | null
  practiceStatus: PracticeStatus
  lessonsCompleted: number
  instructorApprovalStatus: ApprovalStatus
  instructor: {
    id: string
    user: { name: string | null }
  } | null
  courseEnrollments?: Array<{
    course: { practiceLessons: number }
  }>
}

/**
 * Трансформирует одну категорию прогресса в формат Summary
 */
export function transformCategoryProgress(cp: CategoryProgressInput): CategoryProgressSummary {
  // Если courseEnrollments не загружен (для списка), показываем 0
  const totalLessons = cp.courseEnrollments?.reduce((sum, ce) => sum + ce.course.practiceLessons, 0) ?? 0

  return {
    id: cp.id,
    category: cp.category,
    transmissionRestriction: cp.transmissionRestriction,
    practiceStatus: cp.practiceStatus,
    lessonsCompleted: cp.lessonsCompleted,
    lessonsTotal: totalLessons,
    instructorApprovalStatus: cp.instructorApprovalStatus,
    instructor: cp.instructor
      ? {
          id: cp.instructor.id,
          name: cp.instructor.user.name || 'Без имени',
        }
      : null,
  }
}

/**
 * Трансформирует массив категорий прогресса
 */
export function transformCategoryProgressList(categories: CategoryProgressInput[]): CategoryProgressSummary[] {
  return categories.map(transformCategoryProgress)
}
