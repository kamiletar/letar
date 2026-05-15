import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addMemberToGroupAction,
  bulkAddMembersAction,
  getAvailableStudentsAction,
  getGroupMembersAction,
  removeMemberFromGroupAction,
  restoreMemberAction,
} from '../study-group-member.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    member: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    studyGroup: {
      findUnique: vi.fn(),
    },
    studyGroupMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    chat: {
      findFirst: vi.fn(),
    },
    chatParticipant: {
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    theoryLesson: {
      findMany: vi.fn(),
    },
    theoryAttendance: {
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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// === Тестовые данные ===

const testGroupId = 'group-1'
const testSchoolId = 'school-1'

// === Тесты ===

describe('study-group-member.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // По умолчанию — пользователь с правами управления группой
    mockPrisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      organizationId: testSchoolId,
      userId: 'user-admin-1',
      role: 'owner',
    })
    mockPrisma.studyGroup.findUnique.mockResolvedValue({
      id: testGroupId,
      organizationId: testSchoolId,
      maxStudents: 30,
      members: [],
    })
  })

  describe('getAvailableStudentsAction', () => {
    it('возвращает список доступных студентов', async () => {
      mockPrisma.studyGroupMember.findMany.mockResolvedValue([])
      mockPrisma.member.findMany.mockResolvedValue([
        { userId: 'stu-1', user: { id: 'stu-1', name: 'Ученик 1', image: null, phone: null } },
        { userId: 'stu-2', user: { id: 'stu-2', name: 'Ученик 2', image: null, phone: null } },
      ])

      const result = await getAvailableStudentsAction(testGroupId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.students).toHaveLength(2)
      }
    })

    it('возвращает UNAUTHORIZED если нет сессии', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      const result = await getAvailableStudentsAction(testGroupId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
      }
    })
  })

  describe('getGroupMembersAction', () => {
    it('возвращает участников группы', async () => {
      mockPrisma.studyGroupMember.findMany.mockResolvedValue([
        {
          id: 'gm-1',
          userId: 'stu-1',
          status: 'ACTIVE',
          joinedAt: new Date(),
          user: { id: 'stu-1', name: 'Ученик 1', image: null, phone: null },
        },
      ])
      mockPrisma.theoryLesson.findMany.mockResolvedValue([])
      mockPrisma.theoryAttendance.findMany.mockResolvedValue([])

      const result = await getGroupMembersAction(testGroupId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.members).toHaveLength(1)
      }
    })
  })

  describe('addMemberToGroupAction', () => {
    it('успешно добавляет студента', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'stu-1' })
      mockPrisma.member.findFirst
        .mockResolvedValueOnce({ role: 'owner' }) // canManageGroup
        .mockResolvedValueOnce({ role: 'member' }) // проверка, что студент — member школы
      mockPrisma.studyGroupMember.findFirst.mockResolvedValue(null) // не в группе
      mockPrisma.studyGroup.findUnique.mockResolvedValue({
        id: testGroupId,
        organizationId: testSchoolId,
        maxStudents: 30,
        members: [{ status: 'ACTIVE' }],
      })
      mockPrisma.studyGroupMember.create.mockResolvedValue({ id: 'gm-new' })
      mockPrisma.chat.findFirst.mockResolvedValue(null) // нет чата

      const result = await addMemberToGroupAction(testGroupId, 'stu-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.memberId).toBe('gm-new')
      }
    })

    it('возвращает ALREADY_MEMBER', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'stu-1' })
      mockPrisma.member.findFirst.mockResolvedValueOnce({ role: 'owner' }).mockResolvedValueOnce({ role: 'member' })
      mockPrisma.studyGroupMember.findFirst.mockResolvedValue({
        id: 'existing',
        status: 'ACTIVE',
      })

      const result = await addMemberToGroupAction(testGroupId, 'stu-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('ALREADY_MEMBER')
      }
    })

    it('возвращает USER_NOT_FOUND', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await addMemberToGroupAction(testGroupId, 'nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('USER_NOT_FOUND')
      }
    })
  })

  describe('bulkAddMembersAction', () => {
    it('успешно добавляет несколько студентов', async () => {
      mockPrisma.studyGroup.findUnique.mockResolvedValue({
        id: testGroupId,
        organizationId: testSchoolId,
        maxStudents: 30,
        members: [],
      })
      mockPrisma.studyGroupMember.findMany.mockResolvedValue([])
      mockPrisma.member.findMany.mockResolvedValue([
        { userId: 'stu-1', role: 'member' },
        { userId: 'stu-2', role: 'member' },
      ])
      mockPrisma.studyGroupMember.createMany.mockResolvedValue({ count: 2 })
      mockPrisma.chat.findFirst.mockResolvedValue(null)

      const result = await bulkAddMembersAction(testGroupId, ['stu-1', 'stu-2'])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.addedCount).toBe(2)
      }
    })
  })

  describe('removeMemberFromGroupAction', () => {
    it('успешно удаляет участника', async () => {
      mockPrisma.studyGroupMember.findUnique.mockResolvedValue({
        id: 'gm-1',
        userId: 'stu-1',
        status: 'ACTIVE',
        group: { id: testGroupId, organizationId: testSchoolId },
      })
      mockPrisma.member.findFirst.mockResolvedValue({ role: 'owner' })
      mockPrisma.studyGroupMember.update.mockResolvedValue({})
      mockPrisma.chat.findFirst.mockResolvedValue(null)

      const result = await removeMemberFromGroupAction('gm-1')

      expect(result.success).toBe(true)
    })

    it('возвращает NOT_FOUND', async () => {
      mockPrisma.studyGroupMember.findUnique.mockResolvedValue(null)

      const result = await removeMemberFromGroupAction('nonexistent')

      expect(result.success).toBe(false)
    })
  })

  describe('restoreMemberAction', () => {
    it('успешно восстанавливает участника', async () => {
      mockPrisma.studyGroupMember.findUnique.mockResolvedValue({
        id: 'gm-1',
        userId: 'stu-1',
        status: 'REMOVED',
        group: { id: testGroupId, organizationId: testSchoolId, maxStudents: 30, members: [] },
      })
      mockPrisma.member.findFirst.mockResolvedValue({ role: 'owner' })
      mockPrisma.studyGroupMember.update.mockResolvedValue({ id: 'gm-1' })
      mockPrisma.chat.findFirst.mockResolvedValue(null)

      const result = await restoreMemberAction('gm-1')

      expect(result.success).toBe(true)
    })
  })
})
