import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createPartnershipAction,
  getIncomingRequestsAction,
  getPartnerSchoolsAction,
  getPartnershipAction,
  getPartnershipsAction,
  respondPartnershipAction,
  updatePartnershipStatusAction,
} from '../partnership.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    member: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    schoolPartnership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    partnershipCategory: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/action-helpers', () => ({
  requireAuth: vi.fn(async () => ({
    success: true,
    user: { id: 'user-owner-1', roles: ['USER'] },
  })),
  requireSuperManager: vi.fn(async () => ({
    success: true,
    user: { id: 'user-owner-1', roles: ['USER'] },
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

const testOrgId = 'org-1'

// === Тесты ===

describe('partnership.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // По умолчанию пользователь — владелец школы
    mockPrisma.member.findUnique.mockResolvedValue({
      id: 'member-1',
      organizationId: testOrgId,
      userId: 'user-owner-1',
      role: 'owner',
    })
    // По умолчанию нет владельцев для уведомлений
    mockPrisma.member.findMany.mockResolvedValue([])
  })

  describe('getPartnershipsAction', () => {
    it('возвращает список партнёрств', async () => {
      mockPrisma.schoolPartnership.findMany.mockResolvedValue([
        {
          id: 'p1',
          requestingOrgId: testOrgId,
          receivingOrgId: 'org-2',
          status: 'ACTIVE',
          requestingOrg: { id: testOrgId, name: 'Школа 1', logo: null },
          receivingOrg: { id: 'org-2', name: 'Школа 2', logo: null },
          categories: [],
          createdAt: new Date(),
        },
      ])

      const result = await getPartnershipsAction(testOrgId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.partnerships).toHaveLength(1)
      }
    })

    it('возвращает ошибку при отсутствии авторизации', async () => {
      const { requireSuperManager } = await import('@/lib/action-helpers')
      vi.mocked(requireSuperManager).mockResolvedValueOnce({
        success: false,
        error: 'UNAUTHORIZED',
      })

      const result = await getPartnershipsAction(testOrgId)

      expect(result.success).toBe(false)
    })
  })

  describe('getPartnershipAction', () => {
    it('возвращает партнёрство по ID', async () => {
      mockPrisma.schoolPartnership.findUnique.mockResolvedValue({
        id: 'p1',
        requestingOrgId: testOrgId,
        receivingOrgId: 'org-2',
        status: 'ACTIVE',
        requestingOrg: { id: testOrgId, name: 'Школа 1', logo: null },
        receivingOrg: { id: 'org-2', name: 'Школа 2', logo: null },
        categories: [],
        createdAt: new Date(),
      })

      const result = await getPartnershipAction('p1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.partnership).toBeDefined()
      }
    })

    it('возвращает NOT_FOUND', async () => {
      mockPrisma.schoolPartnership.findUnique.mockResolvedValue(null)

      const result = await getPartnershipAction('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('getIncomingRequestsAction', () => {
    it('возвращает входящие запросы', async () => {
      mockPrisma.schoolPartnership.findMany.mockResolvedValue([
        {
          id: 'p1',
          requestingOrgId: 'org-2',
          receivingOrgId: testOrgId,
          status: 'PENDING',
          requestingOrg: { id: 'org-2', name: 'Школа 2', logo: null },
          receivingOrg: { id: testOrgId, name: 'Школа 1', logo: null },
          categories: [],
          createdAt: new Date(),
        },
      ])

      const result = await getIncomingRequestsAction(testOrgId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.requests).toHaveLength(1)
      }
    })
  })

  describe('getPartnerSchoolsAction', () => {
    it('возвращает список школ для партнёрства', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([{ id: 'org-2', name: 'Школа 2', logo: null }])
      mockPrisma.schoolPartnership.findMany.mockResolvedValue([])

      const result = await getPartnerSchoolsAction(testOrgId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.schools).toHaveLength(1)
      }
    })
  })

  describe('createPartnershipAction', () => {
    it('успешно создаёт запрос на партнёрство', async () => {
      // Проверка, что партнёр существует + название инициатора
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce({ id: 'org-2' })
        .mockResolvedValueOnce({ name: 'Школа 1' })
      // Проверка, что партнёрство не существует
      mockPrisma.schoolPartnership.findUnique.mockResolvedValue(null)
      mockPrisma.schoolPartnership.create.mockResolvedValue({ id: 'new-p' })

      const result = await createPartnershipAction(testOrgId, {
        partnerOrgId: 'org-2',
        categories: [{ category: 'B', pricePerLesson: 1500 }],
      } as never)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.partnershipId).toBe('new-p')
      }
    })

    it('возвращает CANNOT_PARTNER_SELF', async () => {
      const result = await createPartnershipAction(testOrgId, {
        partnerOrgId: testOrgId,
        categories: [{ category: 'B' }],
      } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CANNOT_PARTNER_SELF')
      }
    })
  })

  describe('respondPartnershipAction', () => {
    it('успешно принимает запрос', async () => {
      mockPrisma.schoolPartnership.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'PENDING',
        partnerOrgId: testOrgId,
        initiatorOrgId: 'org-2',
        partnerOrg: { name: 'Школа 1' },
      })
      mockPrisma.schoolPartnership.update.mockResolvedValue({})

      const result = await respondPartnershipAction('p1', true)

      expect(result.success).toBe(true)
      expect(mockPrisma.schoolPartnership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        })
      )
    })

    it('успешно отклоняет запрос', async () => {
      mockPrisma.schoolPartnership.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'PENDING',
        partnerOrgId: testOrgId,
        initiatorOrgId: 'org-2',
        partnerOrg: { name: 'Школа 1' },
      })
      mockPrisma.schoolPartnership.update.mockResolvedValue({})

      const result = await respondPartnershipAction('p1', false)

      expect(result.success).toBe(true)
      expect(mockPrisma.schoolPartnership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'TERMINATED' }),
        })
      )
    })

    it('возвращает NOT_FOUND', async () => {
      mockPrisma.schoolPartnership.findUnique.mockResolvedValue(null)

      const result = await respondPartnershipAction('nonexistent', true)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('updatePartnershipStatusAction', () => {
    it('успешно приостанавливает партнёрство', async () => {
      mockPrisma.schoolPartnership.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'ACTIVE',
        initiatorOrgId: testOrgId,
        partnerOrgId: 'org-2',
        initiatorOrg: { name: 'Школа 1' },
        partnerOrg: { name: 'Школа 2' },
      })
      mockPrisma.schoolPartnership.update.mockResolvedValue({})

      const result = await updatePartnershipStatusAction({
        partnershipId: 'p1',
        action: 'suspend',
      } as never)

      expect(result.success).toBe(true)
    })

    it('возвращает NOT_FOUND', async () => {
      mockPrisma.schoolPartnership.findUnique.mockResolvedValue(null)

      const result = await updatePartnershipStatusAction({
        partnershipId: 'nonexistent',
        action: 'suspend',
      } as never)

      expect(result.success).toBe(false)
    })
  })
})
