import { beforeEach, describe, expect, it, vi } from 'vitest'

import { exportLessonsToCSV, getInstructorStats } from '../stats.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    lesson: {
      findMany: vi.fn(),
    },
    studentInstructorConnection: {
      findMany: vi.fn(),
    },
    penalty: {
      findMany: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/action-helpers', () => ({
  withInstructor: vi.fn((callback: (user: unknown, instructorProfileId: string) => Promise<unknown>) => {
    const mockUser = { id: 'user-instructor-1', roles: ['FREELANCE_INSTRUCTOR'] }
    return callback(mockUser, 'instructor-profile-1')
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// === Тесты ===

describe('stats.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getInstructorStats', () => {
    it('успешно получает статистику за месяц', async () => {
      const now = new Date()
      mockPrisma.lesson.findMany.mockResolvedValue([
        {
          status: 'COMPLETED',
          createdAt: now,
          lessonTypeId: 'lt-1',
          price: 2000,
          lessonType: { id: 'lt-1', name: 'Вождение' },
          slot: { startTime: now },
        },
        {
          status: 'CANCELLED',
          createdAt: now,
          lessonTypeId: 'lt-1',
          price: null,
          lessonType: { id: 'lt-1', name: 'Вождение' },
          slot: { startTime: now },
        },
        {
          status: 'PENDING',
          createdAt: now,
          lessonTypeId: null,
          price: null,
          lessonType: null,
          slot: { startTime: now },
        },
      ])

      mockPrisma.studentInstructorConnection.findMany.mockResolvedValue([
        { status: 'ACTIVE', prepaidLessons: 5 },
        { status: 'ACTIVE', prepaidLessons: 3 },
        { status: 'DISCONNECTED', prepaidLessons: 0 },
      ])

      mockPrisma.penalty.findMany.mockResolvedValue([
        { status: 'CHARGED', amount: 500 },
        { status: 'PAID', amount: 300 },
      ])

      const result = await getInstructorStats('month')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.stats.lessons.total).toBe(3)
        expect(result.stats.lessons.completed).toBe(1)
        expect(result.stats.lessons.cancelled).toBe(1)
        expect(result.stats.lessons.pending).toBe(1)

        expect(result.stats.students.total).toBe(3)
        expect(result.stats.students.active).toBe(2)
        expect(result.stats.students.disconnected).toBe(1)

        expect(result.stats.finance.totalPrepaidBalance).toBe(8)
        expect(result.stats.finance.totalRevenue).toBe(2000)
        expect(result.stats.finance.totalPenaltiesCharged).toBe(1)
        expect(result.stats.finance.totalPenaltiesPaid).toBe(1)

        expect(result.stats.lessonTypeStats).toHaveLength(1)
        expect(result.stats.lessonTypeStats[0].name).toBe('Вождение')
        expect(result.stats.lessonTypeStats[0].completedCount).toBe(1)
        expect(result.stats.lessonTypeStats[0].revenue).toBe(2000)
      }
    })

    it('возвращает пустую статистику если нет данных', async () => {
      mockPrisma.lesson.findMany.mockResolvedValue([])
      mockPrisma.studentInstructorConnection.findMany.mockResolvedValue([])
      mockPrisma.penalty.findMany.mockResolvedValue([])

      const result = await getInstructorStats('week')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.stats.lessons.total).toBe(0)
        expect(result.stats.students.total).toBe(0)
        expect(result.stats.finance.totalRevenue).toBe(0)
        expect(result.stats.lessonTypeStats).toHaveLength(0)
      }
    })

    it('обрабатывает ошибку БД', async () => {
      mockPrisma.lesson.findMany.mockRejectedValue(new Error('DB error'))

      const result = await getInstructorStats('month')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNKNOWN_ERROR')
      }
    })

    it('проверяет что withInstructor вызывается', async () => {
      const { withInstructor } = await import('@/lib/action-helpers')

      mockPrisma.lesson.findMany.mockResolvedValue([])
      mockPrisma.studentInstructorConnection.findMany.mockResolvedValue([])
      mockPrisma.penalty.findMany.mockResolvedValue([])

      await getInstructorStats()

      expect(withInstructor).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe('exportLessonsToCSV', () => {
    it('успешно экспортирует данные в CSV формат', async () => {
      const testDate = new Date('2025-03-15T10:00:00Z')
      mockPrisma.lesson.findMany.mockResolvedValue([
        {
          status: 'COMPLETED',
          instructorNotes: 'Хорошее занятие',
          slot: { startTime: testDate },
          student: { name: 'Иван Иванов', email: 'ivan@test.ru' },
        },
      ])

      const result = await exportLessonsToCSV('month')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].student).toBe('Иван Иванов')
        expect(result.data[0].status).toBe('Завершено')
        expect(result.data[0].notes).toBe('Хорошее занятие')
        expect(result.filename).toContain('занятия_месяц_')
      }
    })

    it('обрабатывает ошибку при экспорте', async () => {
      mockPrisma.lesson.findMany.mockRejectedValue(new Error('DB error'))

      const result = await exportLessonsToCSV('week')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Произошла ошибка')
      }
    })
  })
})
