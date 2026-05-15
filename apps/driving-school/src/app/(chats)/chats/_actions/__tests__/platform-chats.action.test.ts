import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getAllPlatformSupportChatsAction,
  getOrCreatePlatformFeedbackChatAction,
  getOrCreatePlatformSupportChatAction,
  getOrCreateSchoolStudentChatAction,
  getSchoolStudentChatsAction,
} from '../platform-chats.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    member: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    chat: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    chatParticipant: {
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => ({
    session: { id: 'session-1' },
    user: { id: 'user-manager-1', roles: ['USER'] },
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

// === Тесты ===

describe('platform-chats.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrCreatePlatformFeedbackChatAction', () => {
    it('возвращает существующий чат feedback', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'member-1' })
      mockPrisma.chat.findFirst.mockResolvedValue({ id: 'chat-feedback' })
      mockPrisma.chatParticipant.findUnique.mockResolvedValue({ id: 'p-1' })

      const result = await getOrCreatePlatformFeedbackChatAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chatId).toBe('chat-feedback')
      }
    })

    it('создаёт чат если не существует', async () => {
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'member-1' })
      mockPrisma.chat.findFirst.mockResolvedValue(null)
      mockPrisma.chat.create.mockResolvedValue({ id: 'new-chat' })
      mockPrisma.chatParticipant.findUnique.mockResolvedValue(null)
      mockPrisma.chatParticipant.create.mockResolvedValue({})

      const result = await getOrCreatePlatformFeedbackChatAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chatId).toBe('new-chat')
      }
    })

    it('возвращает UNAUTHORIZED если нет сессии', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      const result = await getOrCreatePlatformFeedbackChatAction()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
      }
    })

    it('возвращает FORBIDDEN если нет прав', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      const result = await getOrCreatePlatformFeedbackChatAction()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })

  describe('getOrCreatePlatformSupportChatAction', () => {
    it('возвращает существующий чат поддержки', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'owner' })
      mockPrisma.organization.findUnique.mockResolvedValue({ name: 'Школа' })
      mockPrisma.chat.findFirst.mockResolvedValue({ id: 'chat-support' })
      mockPrisma.chatParticipant.findUnique.mockResolvedValue({ id: 'p-1' })

      const result = await getOrCreatePlatformSupportChatAction('org-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chatId).toBe('chat-support')
      }
    })

    it('возвращает ORGANIZATION_NOT_FOUND', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'owner' })
      mockPrisma.organization.findUnique.mockResolvedValue(null)

      const result = await getOrCreatePlatformSupportChatAction('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('ORGANIZATION_NOT_FOUND')
      }
    })

    it('возвращает FORBIDDEN для обычного пользователя', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null)

      const result = await getOrCreatePlatformSupportChatAction('org-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })

  describe('getOrCreateSchoolStudentChatAction', () => {
    it('создаёт чат школы с учеником', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'manager' })
      mockPrisma.organization.findUnique.mockResolvedValue({ name: 'Школа' })
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Ученик' })
      mockPrisma.chat.findFirst.mockResolvedValue(null)
      mockPrisma.chat.create.mockResolvedValue({ id: 'new-student-chat' })
      mockPrisma.chatParticipant.create.mockResolvedValue({})
      mockPrisma.chatParticipant.findUnique.mockResolvedValue(null)

      const result = await getOrCreateSchoolStudentChatAction('org-1', 'student-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chatId).toBe('new-student-chat')
      }
    })

    it('возвращает STUDENT_NOT_FOUND', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'manager' })
      mockPrisma.organization.findUnique.mockResolvedValue({ name: 'Школа' })
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await getOrCreateSchoolStudentChatAction('org-1', 'nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('STUDENT_NOT_FOUND')
      }
    })
  })

  describe('getAllPlatformSupportChatsAction', () => {
    it('возвращает список для OWNER', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce({
        session: { id: 's1' },
        user: { id: 'owner-1', roles: ['OWNER'] },
      } as never)
      mockPrisma.chat.findMany.mockResolvedValue([{ id: 'c1', name: 'Поддержка: Школа 1', organizationId: 'org-1' }])

      const result = await getAllPlatformSupportChatsAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chats).toHaveLength(1)
      }
    })

    it('возвращает FORBIDDEN для не-OWNER', async () => {
      const result = await getAllPlatformSupportChatsAction()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })

  describe('getSchoolStudentChatsAction', () => {
    it('возвращает список чатов школы', async () => {
      mockPrisma.member.findUnique.mockResolvedValue({ role: 'manager' })
      mockPrisma.chat.findMany.mockResolvedValue([
        { id: 'c1', name: 'Школа → Ученик', studentUserId: 'stu-1', studentUser: { name: 'Ученик' } },
      ])

      const result = await getSchoolStudentChatsAction('org-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chats).toHaveLength(1)
        expect(result.chats[0].studentName).toBe('Ученик')
      }
    })

    it('возвращает FORBIDDEN для обычного пользователя', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null)

      const result = await getSchoolStudentChatsAction('org-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })
})
