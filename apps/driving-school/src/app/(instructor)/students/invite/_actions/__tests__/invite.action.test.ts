import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  acceptInvitation,
  createInvitationAction,
  declineInvitation,
  getInvitation,
  getMyInvitations,
} from '../invite.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    invitation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    studentInstructorConnection: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  }
  return { mockPrisma }
})

vi.mock('@/lib/action-helpers', () => ({
  requireInstructor: vi.fn(async () => ({
    success: true,
    user: { id: 'user-instructor-1', roles: ['FREELANCE_INSTRUCTOR'] },
    instructorProfileId: 'instructor-profile-1',
  })),
}))

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => ({
    session: { id: 'session-1' },
    user: { id: 'user-student-1', roles: ['USER'] },
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

vi.mock('@/app/(chats)/chats/_actions/chat.action', () => ({
  addStudentToInstructorChatAction: vi.fn(async () => ({ success: true })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// === Тесты ===

describe('invite.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createInvitationAction', () => {
    it('успешно создаёт приглашение по email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.invitation.create.mockResolvedValue({
        id: 'inv-1',
        token: 'abc123',
        expiresAt: new Date('2025-04-01'),
      })

      const result = await createInvitationAction({ email: 'student@test.ru' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.token).toBe('abc123')
        expect(result.expiresAt).toBeDefined()
      }
    })

    it('создаёт приглашение без email (ссылка)', async () => {
      mockPrisma.invitation.create.mockResolvedValue({
        id: 'inv-2',
        token: 'link-token',
        expiresAt: new Date('2025-04-01'),
      })

      const result = await createInvitationAction({ email: '' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.token).toBe('link-token')
      }
    })

    it('возвращает ALREADY_CONNECTED если связь уже существует', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-student-1',
        email: 'student@test.ru',
        studentProfile: { id: 'sp-1' },
      })
      mockPrisma.studentInstructorConnection.findFirst.mockResolvedValue({
        id: 'conn-1',
        status: 'ACTIVE',
      })

      const result = await createInvitationAction({ email: 'student@test.ru' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('ALREADY_CONNECTED')
      }
    })
  })

  describe('acceptInvitation', () => {
    it('успешно принимает приглашение', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-student-1',
        studentProfile: { id: 'sp-1' },
      })
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'abc123',
        status: 'PENDING',
        instructorId: 'instructor-profile-1',
        expiresAt: new Date(Date.now() + 86400000),
        instructor: { user: { id: 'user-instructor-1' } },
      })
      mockPrisma.studentInstructorConnection.findFirst.mockResolvedValue(null)
      mockPrisma.studentInstructorConnection.create.mockResolvedValue({})
      mockPrisma.invitation.update.mockResolvedValue({})

      const result = await acceptInvitation('abc123')

      expect(result.success).toBe(true)
    })

    it('возвращает NOT_FOUND если приглашение не найдено', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-student-1',
        studentProfile: { id: 'sp-1' },
      })
      mockPrisma.invitation.findUnique.mockResolvedValue(null)

      const result = await acceptInvitation('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('возвращает ALREADY_ACCEPTED если уже принято', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-student-1',
        studentProfile: { id: 'sp-1' },
      })
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'ACCEPTED',
        instructorId: 'ip-1',
        expiresAt: new Date(Date.now() + 86400000),
        instructor: { user: { id: 'ui-1' } },
      })

      const result = await acceptInvitation('abc123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('ALREADY_ACCEPTED')
      }
    })

    it('возвращает NOT_STUDENT если нет профиля ученика', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        studentProfile: null,
      })

      const result = await acceptInvitation('abc123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_STUDENT')
      }
    })
  })

  describe('declineInvitation', () => {
    it('успешно отклоняет приглашение', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
      })
      mockPrisma.invitation.update.mockResolvedValue({})

      const result = await declineInvitation('abc123')

      expect(result.success).toBe(true)
      expect(mockPrisma.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DECLINED' }),
        })
      )
    })

    it('возвращает NOT_FOUND если приглашение не найдено', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null)

      const result = await declineInvitation('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('возвращает ALREADY_PROCESSED если не PENDING', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'ACCEPTED',
      })

      const result = await declineInvitation('abc123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('ALREADY_PROCESSED')
      }
    })
  })

  describe('getInvitation', () => {
    it('возвращает информацию о приглашении', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'abc123',
        email: 'student@test.ru',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
        instructor: { user: { name: 'Инструктор' } },
      })

      const result = await getInvitation('abc123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.invitation.instructorName).toBe('Инструктор')
        expect(result.invitation.status).toBe('PENDING')
      }
    })

    it('возвращает NOT_FOUND если не найдено', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null)

      const result = await getInvitation('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('getMyInvitations', () => {
    it('возвращает список приглашений инструктора', async () => {
      mockPrisma.invitation.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          token: 't1',
          email: 'a@test.ru',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
          acceptedAt: null,
          declinedAt: null,
        },
        {
          id: 'inv-2',
          token: 't2',
          email: 'b@test.ru',
          status: 'ACCEPTED',
          expiresAt: new Date(),
          createdAt: new Date(),
          acceptedAt: new Date(),
          declinedAt: null,
        },
      ])
      mockPrisma.invitation.updateMany.mockResolvedValue({ count: 0 })

      const result = await getMyInvitations()

      expect(result).not.toBeNull()
      expect(result).toHaveLength(2)
    })

    it('возвращает null при ошибке авторизации', async () => {
      const { requireInstructor } = await import('@/lib/action-helpers')
      vi.mocked(requireInstructor).mockResolvedValueOnce({
        success: false,
        error: 'UNAUTHORIZED',
      })

      const result = await getMyInvitations()

      expect(result).toBeNull()
    })
  })
})
