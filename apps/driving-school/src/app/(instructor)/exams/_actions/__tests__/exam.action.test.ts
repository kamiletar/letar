import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getExamSessionsAction,
  getExamSessionWithRegistrations,
  setBulkExamResultsAction,
  setExamResultAction,
} from '../exam.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    member: {
      findMany: vi.fn(),
    },
    examSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    examRegistration: {
      findUnique: vi.fn(),
    },
    examAttempt: {
      upsert: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/action-helpers', () => ({
  withAuth: vi.fn((callback: (user: unknown) => Promise<unknown>) => {
    const mockUser = { id: 'user-1', roles: ['FREELANCE_INSTRUCTOR'] }
    return callback(mockUser)
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// === Тестовые данные ===

const testSessionId = 'exam-session-1'
const testRegistrationId = 'exam-reg-1'

// === Тесты ===

describe('exam.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getExamSessionsAction', () => {
    it('возвращает экзамены для организаций пользователя', async () => {
      mockPrisma.member.findMany.mockResolvedValue([{ organizationId: 'org-1' }, { organizationId: 'org-2' }])

      mockPrisma.examSession.findMany.mockResolvedValue([
        {
          id: testSessionId,
          organizationId: 'org-1',
          type: 'INTERNAL_THEORY',
          category: 'B',
          scheduledAt: new Date(),
          status: 'SCHEDULED',
          registrations: [
            { id: 'reg-1', user: { id: 'u1', name: 'Ученик 1' }, attempt: null },
            { id: 'reg-2', user: { id: 'u2', name: 'Ученик 2' }, attempt: null },
          ],
        },
      ])

      const result = await getExamSessionsAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.sessions).toHaveLength(1)
        expect(result.sessions![0].registrationsCount).toBe(2)
      }
    })

    it('возвращает пустой список если нет членств', async () => {
      mockPrisma.member.findMany.mockResolvedValue([])

      const result = await getExamSessionsAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.sessions).toEqual([])
      }
    })

    it('обрабатывает ошибку БД', async () => {
      mockPrisma.member.findMany.mockRejectedValue(new Error('DB error'))

      const result = await getExamSessionsAction()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Ошибка')
    })
  })

  describe('getExamSessionWithRegistrations', () => {
    it('возвращает экзамен с участниками', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: testSessionId,
        type: 'GIBDD_PRACTICE_CITY',
        registrations: [{ id: 'reg-1', user: { id: 'u1', name: 'Ученик' }, attempt: null }],
      })

      const result = await getExamSessionWithRegistrations(testSessionId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.session!.id).toBe(testSessionId)
        expect(result.session!.registrationsCount).toBe(1)
      }
    })

    it('возвращает ошибку если экзамен не найден', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue(null)

      const result = await getExamSessionWithRegistrations('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('не найден')
    })
  })

  describe('setExamResultAction', () => {
    it('успешно выставляет результат PASSED', async () => {
      mockPrisma.examRegistration.findUnique.mockResolvedValue({
        id: testRegistrationId,
        sessionId: testSessionId,
        userId: 'student-1',
        session: { id: testSessionId },
      })
      mockPrisma.examAttempt.upsert.mockResolvedValue({
        id: 'attempt-1',
        result: 'PASSED',
      })

      const result = await setExamResultAction(testRegistrationId, 'PASSED', 95, 'Отлично')

      expect(result.success).toBe(true)
      expect(mockPrisma.examAttempt.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { registrationId: testRegistrationId },
          create: expect.objectContaining({
            result: 'PASSED',
            score: 95,
            notes: 'Отлично',
          }),
        })
      )
    })

    it('возвращает ошибку если регистрация не найдена', async () => {
      mockPrisma.examRegistration.findUnique.mockResolvedValue(null)

      const result = await setExamResultAction('nonexistent', 'FAILED')

      expect(result.success).toBe(false)
      expect(result.error).toContain('не найдена')
    })
  })

  describe('setBulkExamResultsAction', () => {
    it('успешно выставляет массовые результаты', async () => {
      mockPrisma.examRegistration.findUnique
        .mockResolvedValueOnce({ sessionId: 's1', userId: 'u1' })
        .mockResolvedValueOnce({ sessionId: 's1', userId: 'u2' })
      mockPrisma.examAttempt.upsert.mockResolvedValue({})

      const result = await setBulkExamResultsAction([
        { registrationId: 'reg-1', result: 'PASSED', score: 90 },
        { registrationId: 'reg-2', result: 'FAILED' },
      ])

      expect(result.success).toBe(true)
      expect(mockPrisma.examAttempt.upsert).toHaveBeenCalledTimes(2)
    })

    it('пропускает несуществующие регистрации', async () => {
      mockPrisma.examRegistration.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ sessionId: 's1', userId: 'u2' })
      mockPrisma.examAttempt.upsert.mockResolvedValue({})

      const result = await setBulkExamResultsAction([
        { registrationId: 'nonexistent', result: 'PASSED' },
        { registrationId: 'reg-2', result: 'FAILED' },
      ])

      expect(result.success).toBe(true)
      expect(mockPrisma.examAttempt.upsert).toHaveBeenCalledTimes(1)
    })
  })
})
