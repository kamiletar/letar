import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  canReviewLessonAction,
  createReviewAction,
  getInstructorReviewsAction,
  getMyReviewsAction,
  reportReviewAction,
  respondToReviewAction,
} from '../review.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    review: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    lesson: {
      findUnique: vi.fn(),
    },
    member: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    reviewReport: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/action-helpers', () => ({
  requireAuth: vi.fn(async () => ({
    success: true,
    user: { id: 'user-student-1', roles: ['USER'] },
  })),
  requireInstructor: vi.fn(async () => ({
    success: true,
    user: { id: 'user-instructor-1', roles: ['FREELANCE_INSTRUCTOR'] },
    instructorProfileId: 'ip-1',
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('../../_schemas/review-form.schema', () => ({
  ReviewFormSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
  ReviewResponseSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
  ReviewReportSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
}))

vi.mock('../review-utils', () => ({
  updateInstructorRating: vi.fn(),
  updateSchoolRating: vi.fn(),
}))

// === Тесты ===

describe('review.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMyReviewsAction', () => {
    it('возвращает список отзывов пользователя', async () => {
      mockPrisma.review.findMany.mockResolvedValue([
        {
          id: 'r1',
          rating: 5,
          text: 'Отличный инструктор!',
          createdAt: new Date(),
          lesson: { id: 'l1' },
          instructorProfile: { user: { name: 'Инструктор', image: null } },
          organization: null,
          response: null,
        },
      ])

      const result = await getMyReviewsAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.reviews).toHaveLength(1)
      }
    })

    it('возвращает ошибку при отсутствии авторизации', async () => {
      const { requireAuth } = await import('@/lib/action-helpers')
      vi.mocked(requireAuth).mockResolvedValueOnce({
        success: false,
        error: 'UNAUTHORIZED',
      })

      const result = await getMyReviewsAction()

      expect(result.success).toBe(false)
    })
  })

  describe('getInstructorReviewsAction', () => {
    it('возвращает отзывы для инструктора', async () => {
      mockPrisma.review.findMany.mockResolvedValue([
        {
          id: 'r1',
          rating: 4,
          text: 'Хорошо',
          createdAt: new Date(),
          author: { name: 'Ученик', image: null },
          response: null,
        },
      ])

      const result = await getInstructorReviewsAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.reviews).toHaveLength(1)
      }
    })

    it('возвращает ошибку для не-инструктора', async () => {
      const { requireInstructor } = await import('@/lib/action-helpers')
      vi.mocked(requireInstructor).mockResolvedValueOnce({
        success: false,
        error: 'NOT_INSTRUCTOR',
      })

      const result = await getInstructorReviewsAction()

      expect(result.success).toBe(false)
    })
  })

  describe('createReviewAction', () => {
    it('успешно создаёт отзыв на урок', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        studentId: 'user-student-1',
        status: 'COMPLETED',
        instructorId: 'instructor-user-1',
        instructor: {
          instructorProfile: { id: 'ip-1' },
        },
        review: null,
      })
      mockPrisma.review.create.mockResolvedValue({ id: 'new-review' })
      mockPrisma.review.update.mockResolvedValue({})

      const result = await createReviewAction({
        lessonId: 'lesson-1',
        rating: 5,
        text: 'Отлично!',
      } as never)

      expect(result.success).toBe(true)
    })

    it('возвращает ошибку если урок не найден', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(null)

      const result = await createReviewAction({
        lessonId: 'nonexistent',
        rating: 5,
      } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })

    it('возвращает ошибку если отзыв уже оставлен', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        studentId: 'user-student-1',
        status: 'COMPLETED',
        instructor: { instructorProfile: { id: 'ip-1' } },
        review: { id: 'existing' },
      })

      const result = await createReviewAction({
        lessonId: 'lesson-1',
        rating: 5,
      } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('уже')
      }
    })
  })

  describe('respondToReviewAction', () => {
    it('успешно отвечает на отзыв', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'r1',
        targetType: 'INSTRUCTOR',
        instructor: {
          userId: 'user-instructor-1',
          user: { id: 'user-instructor-1', name: 'Инструктор' },
        },
        organization: null,
        response: null,
      })
      // respondToReviewAction использует requireAuth, не requireInstructor
      const { requireAuth } = await import('@/lib/action-helpers')
      vi.mocked(requireAuth).mockResolvedValueOnce({
        success: true,
        user: { id: 'user-instructor-1', roles: ['FREELANCE_INSTRUCTOR'] },
      })

      mockPrisma.review.update.mockResolvedValue({})

      const result = await respondToReviewAction({
        reviewId: 'r1',
        response: 'Спасибо за отзыв!',
      } as never)

      expect(result.success).toBe(true)
    })
  })

  describe('reportReviewAction', () => {
    it('успешно создаёт жалобу на отзыв', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({ id: 'r1' })
      mockPrisma.reviewReport.findFirst.mockResolvedValue(null)
      mockPrisma.reviewReport.create.mockResolvedValue({ id: 'report-1' })

      const result = await reportReviewAction({
        reviewId: 'r1',
        reason: 'SPAM',
      } as never)

      expect(result.success).toBe(true)
    })

    it('возвращает ошибку при повторной жалобе', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({ id: 'r1' })
      mockPrisma.reviewReport.findFirst.mockResolvedValue({ id: 'existing' })

      const result = await reportReviewAction({
        reviewId: 'r1',
        reason: 'SPAM',
      } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('уже')
      }
    })
  })

  describe('canReviewLessonAction', () => {
    it('разрешает отзыв на завершённый урок', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        studentId: 'user-student-1',
        status: 'COMPLETED',
        review: null,
      })

      const result = await canReviewLessonAction('lesson-1')

      expect(result.canReview).toBe(true)
    })

    it('запрещает отзыв если уже оставлен', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        studentId: 'user-student-1',
        status: 'COMPLETED',
        review: { id: 'existing' },
      })

      const result = await canReviewLessonAction('lesson-1')

      expect(result.canReview).toBe(false)
    })
  })
})
