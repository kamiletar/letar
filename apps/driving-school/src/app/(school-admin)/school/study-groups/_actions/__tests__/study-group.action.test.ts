import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  archiveStudyGroupAction,
  createStudyGroupAction,
  getStudyGroupAction,
  getStudyGroupsAction,
  restoreStudyGroupAction,
  updateStudyGroupAction,
} from '../study-group.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    member: {
      findFirst: vi.fn(),
    },
    studyGroup: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    theoryLesson: {
      findMany: vi.fn(),
    },
    theoryAttendance: {
      findMany: vi.fn(),
    },
    chat: {
      create: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/action-helpers', () => ({
  requireAuth: vi.fn(async () => ({
    success: true,
    user: { id: 'user-admin-1', roles: ['USER'] },
  })),
  requireSchoolManager: vi.fn(async () => ({
    success: true,
    user: { id: 'user-admin-1', roles: ['USER'] },
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// === Тестовые данные ===

const testSchoolId = 'school-1'
const testGroupId = 'group-1'

// === Тесты ===

describe('study-group.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      organizationId: testSchoolId,
      userId: 'user-admin-1',
      role: 'owner',
    })
  })

  describe('getStudyGroupsAction', () => {
    it('возвращает список учебных групп', async () => {
      mockPrisma.studyGroup.findMany.mockResolvedValue([
        {
          id: testGroupId,
          name: 'Группа Б-1',
          schedule: {},
          categories: ['B'],
          isActive: true,
          startDate: new Date(),
          endDate: null,
          lessonSchedule: {},
          classroomId: null,
          classroom: null,
          theoryHours: null,
          maxStudents: 30,
          organization: { id: testSchoolId, name: 'Школа 1' },
          members: [],
          theoryLessons: [],
        },
      ])

      const result = await getStudyGroupsAction(testSchoolId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.groups).toHaveLength(1)
        expect(result.groups[0].name).toBe('Группа Б-1')
      }
    })

    it('возвращает UNAUTHORIZED если нет сессии', async () => {
      const { requireAuth } = await import('@/lib/action-helpers')
      vi.mocked(requireAuth).mockResolvedValueOnce({
        success: false,
        error: 'UNAUTHORIZED',
      })

      const result = await getStudyGroupsAction(testSchoolId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
      }
    })

    it('возвращает NOT_SCHOOL_MEMBER если нет членства', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      const result = await getStudyGroupsAction(testSchoolId)

      expect(result.success).toBe(false)
    })
  })

  describe('getStudyGroupAction', () => {
    it('возвращает группу с деталями', async () => {
      mockPrisma.studyGroup.findUnique.mockResolvedValue({
        id: testGroupId,
        name: 'Группа Б-1',
        organizationId: testSchoolId,
        schedule: {},
        categories: ['B'],
        isActive: true,
        startDate: new Date(),
        endDate: null,
        lessonSchedule: {},
        classroomId: null,
        classroom: null,
        theoryHours: null,
        maxStudents: 30,
        organization: { id: testSchoolId, name: 'Школа 1' },
        members: [
          {
            id: 'm1',
            userId: 'u1',
            leftAt: null,
            enrolledAt: new Date(),
            user: { id: 'u1', name: 'Ученик', image: null },
          },
        ],
        theoryLessons: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockPrisma.theoryLesson.findMany.mockResolvedValue([])
      mockPrisma.theoryAttendance.findMany.mockResolvedValue([])

      const result = await getStudyGroupAction(testGroupId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.group.name).toBe('Группа Б-1')
      }
    })

    it('возвращает NOT_FOUND', async () => {
      mockPrisma.studyGroup.findUnique.mockResolvedValue(null)

      const result = await getStudyGroupAction('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('createStudyGroupAction', () => {
    it('успешно создаёт группу', async () => {
      mockPrisma.studyGroup.create.mockResolvedValue({ id: 'new-group' })
      mockPrisma.chat.create.mockResolvedValue({ id: 'chat-1' })

      const result = await createStudyGroupAction({
        organizationId: testSchoolId,
        name: 'Новая группа',
        categories: ['B'],
        startDate: new Date(),
        maxStudents: 25,
        schedule: {},
        lessonSchedule: {},
      } as never)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.groupId).toBeDefined()
      }
    })

    it('возвращает ошибку при недостаточных правах', async () => {
      const { requireSchoolManager } = await import('@/lib/action-helpers')
      vi.mocked(requireSchoolManager).mockResolvedValueOnce({
        success: false,
        error: 'UNAUTHORIZED',
      })

      const result = await createStudyGroupAction({
        organizationId: testSchoolId,
        name: 'Тест',
        categories: ['B'],
      } as never)

      expect(result.success).toBe(false)
    })
  })

  describe('updateStudyGroupAction', () => {
    it('успешно обновляет группу', async () => {
      mockPrisma.studyGroup.findUnique.mockResolvedValue({
        id: testGroupId,
        organizationId: testSchoolId,
      })
      mockPrisma.studyGroup.update.mockResolvedValue({})

      const result = await updateStudyGroupAction(testGroupId, {
        name: 'Обновлённое имя',
      } as never)

      expect(result.success).toBe(true)
    })

    it('возвращает NOT_FOUND', async () => {
      mockPrisma.studyGroup.findUnique.mockResolvedValue(null)

      const result = await updateStudyGroupAction('nonexistent', {
        name: 'Тест',
      } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('archiveStudyGroupAction', () => {
    it('успешно архивирует группу', async () => {
      mockPrisma.studyGroup.findUnique.mockResolvedValue({
        id: testGroupId,
        organizationId: testSchoolId,
        isActive: true,
        theoryLessons: [],
      })
      mockPrisma.studyGroup.update.mockResolvedValue({})

      const result = await archiveStudyGroupAction(testGroupId)

      expect(result.success).toBe(true)
    })

    it('возвращает NOT_FOUND', async () => {
      mockPrisma.studyGroup.findUnique.mockResolvedValue(null)

      const result = await archiveStudyGroupAction('nonexistent')

      expect(result.success).toBe(false)
    })
  })

  describe('restoreStudyGroupAction', () => {
    it('успешно восстанавливает группу', async () => {
      mockPrisma.studyGroup.findUnique.mockResolvedValue({
        id: testGroupId,
        organizationId: testSchoolId,
        isActive: false,
      })
      mockPrisma.studyGroup.update.mockResolvedValue({})

      const result = await restoreStudyGroupAction(testGroupId)

      expect(result.success).toBe(true)
    })
  })
})
