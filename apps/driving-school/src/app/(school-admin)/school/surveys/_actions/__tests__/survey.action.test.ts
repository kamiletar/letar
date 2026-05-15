import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createSurveyAction,
  deleteSurveyAction,
  getSurveyByTokenAction,
  getSurveysAction,
  submitSurveyAction,
} from '../survey.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    survey: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    surveyResponse: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    studentProgress: {
      findUnique: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/action-helpers', () => ({
  requireAuth: vi.fn(async () => ({
    success: true,
    user: { id: 'user-1', roles: ['USER'] },
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

vi.mock('@/lib/notifications', () => ({
  notifyUser: vi.fn(async () => undefined),
}))

vi.mock('@/lib/orchestrator-repository', () => ({
  createOrchestratorRepository: vi.fn(() => ({})),
  createNotificationProviders: vi.fn(() => ({})),
}))

vi.mock('@/lib/app-url', () => ({
  getAppUrl: vi.fn(() => 'http://localhost:3003'),
}))

// === Тестовые данные ===

const testOrgId = 'clorg00000000000000001'

// === Тесты ===

describe('survey.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSurveysAction', () => {
    it('возвращает список опросов с NPS статистикой', async () => {
      mockPrisma.survey.findMany.mockResolvedValue([
        {
          id: 'survey-1',
          name: 'Опрос после обучения',
          description: null,
          triggerType: 'AFTER_COMPLETION',
          delayDays: 1,
          expirationDays: 14,
          isActive: true,
          createdAt: new Date(),
          responses: [
            { id: 'r1', status: 'COMPLETED', npsScore: 10 },
            { id: 'r2', status: 'COMPLETED', npsScore: 9 },
            { id: 'r3', status: 'COMPLETED', npsScore: 5 },
            { id: 'r4', status: 'SENT', npsScore: null },
          ],
        },
      ])

      const result = await getSurveysAction(testOrgId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].totalResponses).toBe(4)
        expect(result.data[0].completedResponses).toBe(3)
        // NPS: 2 promoters (10,9) / 3 = 66.7%, 1 detractor (5) / 3 = 33.3%
        // NPS = 67 - 33 = 33
        expect(result.data[0].npsScore).toBe(33)
      }
    })

    it('возвращает npsScore null если нет завершённых ответов', async () => {
      mockPrisma.survey.findMany.mockResolvedValue([
        {
          id: 'survey-1',
          name: 'Пустой',
          description: null,
          triggerType: 'MANUAL',
          delayDays: 0,
          expirationDays: 14,
          isActive: true,
          createdAt: new Date(),
          responses: [],
        },
      ])

      const result = await getSurveysAction(testOrgId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data[0].npsScore).toBeNull()
      }
    })

    it('возвращает ошибку при отсутствии авторизации', async () => {
      const { requireAuth } = await import('@/lib/action-helpers')
      vi.mocked(requireAuth).mockResolvedValueOnce({
        success: false,
        error: 'UNAUTHORIZED',
      })

      const result = await getSurveysAction(testOrgId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('авторизация')
      }
    })
  })

  describe('createSurveyAction', () => {
    it('успешно создаёт опрос', async () => {
      mockPrisma.survey.create.mockResolvedValue({
        id: 'survey-new',
        organizationId: testOrgId,
      })

      const result = await createSurveyAction({
        organizationId: testOrgId,
        name: 'Новый опрос',
        triggerType: 'MANUAL',
        delayDays: 0,
        expirationDays: 14,
        isActive: true,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('survey-new')
      }
    })

    it('возвращает ошибку при дубликате триггера', async () => {
      mockPrisma.survey.create.mockRejectedValue(new Error('Unique constraint'))

      const result = await createSurveyAction({
        organizationId: testOrgId,
        name: 'Дубликат',
        triggerType: 'AFTER_COMPLETION',
        delayDays: 1,
        expirationDays: 14,
        isActive: true,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('уже существует')
      }
    })

    it('возвращает ошибку при невалидных данных', async () => {
      const result = await createSurveyAction({
        organizationId: '',
        name: '',
        triggerType: 'INVALID' as never,
      } as never)

      expect(result.success).toBe(false)
    })
  })

  describe('deleteSurveyAction', () => {
    it('успешно удаляет опрос', async () => {
      mockPrisma.survey.delete.mockResolvedValue({
        id: 'survey-1',
        organizationId: testOrgId,
      })

      const result = await deleteSurveyAction('survey-1')

      expect(result.success).toBe(true)
      expect(mockPrisma.survey.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'survey-1' } }))
    })

    it('обрабатывает ошибку удаления', async () => {
      mockPrisma.survey.delete.mockRejectedValue(new Error('DB error'))

      const result = await deleteSurveyAction('survey-1')

      expect(result.success).toBe(false)
    })
  })

  describe('getSurveyByTokenAction', () => {
    it('возвращает данные опроса по токену', async () => {
      mockPrisma.surveyResponse.findUnique.mockResolvedValue({
        id: 'resp-1',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 86400000),
        survey: {
          name: 'Опрос',
          description: 'Описание',
          organization: { name: 'Школа' },
        },
        progress: {
          user: { name: 'Ученик' },
        },
      })

      const result = await getSurveyByTokenAction('token-123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.surveyName).toBe('Опрос')
        expect(result.data.schoolName).toBe('Школа')
        expect(result.data.isExpired).toBe(false)
        expect(result.data.isCompleted).toBe(false)
      }
    })

    it('возвращает ошибку если токен не найден', async () => {
      mockPrisma.surveyResponse.findUnique.mockResolvedValue(null)

      const result = await getSurveyByTokenAction('bad-token')

      expect(result.success).toBe(false)
    })
  })

  describe('submitSurveyAction', () => {
    it('успешно заполняет опрос', async () => {
      mockPrisma.surveyResponse.findUnique.mockResolvedValue({
        id: 'resp-1',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 86400000),
      })
      mockPrisma.surveyResponse.update.mockResolvedValue({})

      const result = await submitSurveyAction({
        token: 'cuid1234567890abcdefgh',
        npsScore: 9,
        positiveComment: 'Отличная школа!',
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.surveyResponse.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            npsScore: 9,
            status: 'COMPLETED',
          }),
        })
      )
    })

    it('не позволяет повторно заполнить опрос', async () => {
      mockPrisma.surveyResponse.findUnique.mockResolvedValue({
        id: 'resp-1',
        status: 'COMPLETED',
      })

      const result = await submitSurveyAction({
        token: 'cuid1234567890abcdefgh',
        npsScore: 8,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('уже заполнен')
      }
    })
  })
})
