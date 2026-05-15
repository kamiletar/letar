import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSchoolStats, getUserSchools } from '../school-stats.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    member: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    lesson: {
      findMany: vi.fn(),
    },
    instructorProfile: {
      findMany: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => ({
    session: { id: 'session-1' },
    user: { id: 'user-admin-1', roles: ['USER'] },
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

// === Тестовые данные ===

const testSchoolId = 'school-1'

// === Тесты ===

describe('school-stats.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSchoolStats', () => {
    it('возвращает статистику школы', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        id: 'member-1',
        organizationId: testSchoolId,
        userId: 'user-admin-1',
        role: 'owner',
        organization: { id: testSchoolId, name: 'Автошкола', logo: null },
      })
      mockPrisma.member.findMany.mockResolvedValue([
        { userId: 'u1', role: 'owner', user: { id: 'u1', name: 'Админ', image: null } },
        { userId: 'u2', role: 'instructor', user: { id: 'u2', name: 'Инструктор 1', image: null } },
        { userId: 'u3', role: 'member', user: { id: 'u3', name: 'Ученик 1', image: null } },
      ])
      mockPrisma.lesson.findMany.mockResolvedValue([
        { status: 'COMPLETED', instructorId: 'u2' },
        { status: 'COMPLETED', instructorId: 'u2' },
        { status: 'CANCELLED', instructorId: 'u2' },
        { status: 'PENDING', instructorId: 'u2' },
      ])
      mockPrisma.instructorProfile.findMany.mockResolvedValue([
        {
          id: 'ip-1',
          userId: 'u2',
          studentConnections: [
            { status: 'ACTIVE', prepaidLessons: 5 },
            { status: 'INACTIVE', prepaidLessons: 0 },
          ],
        },
      ])

      const result = await getSchoolStats(testSchoolId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.stats.school.name).toBe('Автошкола')
        expect(result.stats.members.totalMembers).toBe(3)
        expect(result.stats.members.admins).toBe(1)
        expect(result.stats.members.instructors).toBe(1)
        expect(result.stats.members.students).toBe(1)
        expect(result.stats.lessons.total).toBe(4)
        expect(result.stats.lessons.completed).toBe(2)
        expect(result.stats.lessons.cancelled).toBe(1)
        expect(result.stats.instructors).toHaveLength(1)
        expect(result.stats.instructors[0].totalStudents).toBe(2)
        expect(result.stats.instructors[0].activeStudents).toBe(1)
        expect(result.stats.instructors[0].totalPrepaidBalance).toBe(5)
      }
    })

    it('возвращает UNAUTHORIZED если нет сессии', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      const result = await getSchoolStats(testSchoolId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
      }
    })

    it('возвращает NOT_SCHOOL_ADMIN если нет прав', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      const result = await getSchoolStats(testSchoolId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_SCHOOL_ADMIN')
      }
    })

    it('поддерживает разные периоды', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({
        id: 'member-1',
        organizationId: testSchoolId,
        userId: 'user-admin-1',
        role: 'owner',
        organization: { id: testSchoolId, name: 'Школа', logo: null },
      })
      mockPrisma.member.findMany.mockResolvedValue([])
      mockPrisma.lesson.findMany.mockResolvedValue([])
      mockPrisma.instructorProfile.findMany.mockResolvedValue([])

      const result = await getSchoolStats(testSchoolId, 'week')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.stats.period.start).toBeDefined()
        expect(result.stats.period.end).toBeDefined()
      }
    })
  })

  describe('getUserSchools', () => {
    it('возвращает список школ пользователя', async () => {
      mockPrisma.member.findMany.mockResolvedValue([
        {
          role: 'owner',
          organization: { id: 'org-1', name: 'Школа 1', logo: null },
        },
        {
          role: 'manager',
          organization: { id: 'org-2', name: 'Школа 2', logo: '/logo.png' },
        },
      ])

      const result = await getUserSchools()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.schools).toHaveLength(2)
        expect(result.schools[0].name).toBe('Школа 1')
        expect(result.schools[1].role).toBe('manager')
      }
    })

    it('возвращает UNAUTHORIZED если нет сессии', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      const result = await getUserSchools()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
      }
    })
  })
})
