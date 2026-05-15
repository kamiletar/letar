import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createContractTemplate,
  createTemplateVersion,
  deleteContractTemplate,
  getContractTemplateDetail,
  getContractTemplates,
  updateContractTemplate,
} from '../contract-templates.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    member: {
      findFirst: vi.fn(),
    },
    contractTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contractTemplateVersion: {
      create: vi.fn(),
    },
    generatedContract: {
      count: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        contractTemplate: {
          create: mockPrisma.contractTemplate.create,
          update: mockPrisma.contractTemplate.update,
        },
        contractTemplateVersion: {
          create: mockPrisma.contractTemplateVersion.create,
        },
      })
    ),
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

const testOrgId = 'clorg00000000000000001'
const testTemplateId = 'cltpl00000000000000001'

// === Тесты ===

describe('contract-templates.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      organizationId: testOrgId,
      userId: 'user-admin-1',
      role: 'owner',
    })
  })

  describe('getContractTemplates', () => {
    it('возвращает список шаблонов', async () => {
      mockPrisma.contractTemplate.findMany.mockResolvedValue([
        {
          id: testTemplateId,
          name: 'Договор обучения',
          type: 'TRAINING_CONTRACT',
          description: null,
          isActive: true,
          currentVersion: { id: 'v1', version: '1.0' },
          updatedAt: new Date(),
        },
      ])

      const result = await getContractTemplates(testOrgId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.templates).toHaveLength(1)
        expect(result.templates[0].name).toBe('Договор обучения')
        expect(result.templates[0].currentVersion?.version).toBe('1.0')
      }
    })

    it('возвращает UNAUTHORIZED если нет сессии', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      const result = await getContractTemplates(testOrgId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('UNAUTHORIZED')
      }
    })

    it('возвращает NOT_SCHOOL_ADMIN если нет прав', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      const result = await getContractTemplates(testOrgId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_SCHOOL_ADMIN')
      }
    })
  })

  describe('getContractTemplateDetail', () => {
    it('возвращает детали шаблона с версиями', async () => {
      mockPrisma.contractTemplate.findUnique.mockResolvedValue({
        id: testTemplateId,
        name: 'Договор',
        type: 'TRAINING_CONTRACT',
        description: 'Описание',
        isActive: true,
        organizationId: testOrgId,
        currentVersion: {
          id: 'v2',
          version: '1.1',
          content: '<p>Содержимое</p>',
          changelog: 'Обновление',
          effectiveAt: new Date(),
          createdAt: new Date(),
        },
        versions: [
          { id: 'v2', version: '1.1', changelog: 'Обновление', effectiveAt: new Date(), createdAt: new Date() },
          { id: 'v1', version: '1.0', changelog: 'Первая', effectiveAt: new Date(), createdAt: new Date() },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await getContractTemplateDetail(testTemplateId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.template.name).toBe('Договор')
        expect(result.template.currentVersion?.version).toBe('1.1')
        expect(result.template.versions).toHaveLength(2)
      }
    })

    it('возвращает NOT_FOUND если шаблон не найден', async () => {
      mockPrisma.contractTemplate.findUnique.mockResolvedValue(null)

      const result = await getContractTemplateDetail('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('createContractTemplate', () => {
    it('успешно создаёт шаблон с первой версией', async () => {
      mockPrisma.contractTemplate.findFirst.mockResolvedValue(null)
      mockPrisma.contractTemplate.create.mockResolvedValue({ id: 'new-template' })
      mockPrisma.contractTemplateVersion.create.mockResolvedValue({ id: 'version-1' })
      mockPrisma.contractTemplate.update.mockResolvedValue({})

      const result = await createContractTemplate({
        organizationId: testOrgId,
        name: 'Новый договор',
        type: 'TRAINING_CONTRACT',
        content: 'Содержимое договора длиннее 10 символов',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.templateId).toBe('new-template')
      }
    })

    it('возвращает ошибку при дубликате имени', async () => {
      mockPrisma.contractTemplate.findFirst.mockResolvedValue({ id: 'existing' })

      const result = await createContractTemplate({
        organizationId: testOrgId,
        name: 'Существующий',
        type: 'TRAINING_CONTRACT',
        content: 'Содержимое договора длиннее 10 символов',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('уже существует')
      }
    })

    it('возвращает ошибку при недостаточных правах', async () => {
      mockPrisma.member.findFirst.mockResolvedValue(null)

      const result = await createContractTemplate({
        organizationId: testOrgId,
        name: 'Тест',
        type: 'CUSTOM',
        content: 'Содержимое длиннее 10 символов',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Недостаточно прав')
      }
    })
  })

  describe('updateContractTemplate', () => {
    it('успешно обновляет шаблон', async () => {
      mockPrisma.contractTemplate.findUnique.mockResolvedValue({
        id: testTemplateId,
        name: 'Старое имя',
        organizationId: testOrgId,
      })
      mockPrisma.contractTemplate.findFirst.mockResolvedValue(null)
      mockPrisma.contractTemplate.update.mockResolvedValue({})

      const result = await updateContractTemplate({
        id: testTemplateId,
        name: 'Новое имя',
      })

      expect(result.success).toBe(true)
    })

    it('возвращает ошибку если шаблон не найден', async () => {
      mockPrisma.contractTemplate.findUnique.mockResolvedValue(null)

      const result = await updateContractTemplate({
        id: 'clnon00000000000000001',
        name: 'Тест',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не найден')
      }
    })
  })

  describe('createTemplateVersion', () => {
    it('создаёт новую версию с автоинкрементом', async () => {
      mockPrisma.contractTemplate.findUnique.mockResolvedValue({
        id: testTemplateId,
        organizationId: testOrgId,
        currentVersion: { version: '1.0' },
        versions: [{ version: '1.0' }],
      })
      mockPrisma.contractTemplateVersion.create.mockResolvedValue({ id: 'new-version' })
      mockPrisma.contractTemplate.update.mockResolvedValue({})

      const result = await createTemplateVersion({
        templateId: testTemplateId,
        content: 'Новое содержимое длиннее 10 символов',
        changelog: 'Исправления',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.versionId).toBe('new-version')
      }
      expect(mockPrisma.contractTemplateVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: '1.1',
          }),
        })
      )
    })
  })

  describe('deleteContractTemplate', () => {
    it('успешно удаляет шаблон без сгенерированных договоров', async () => {
      mockPrisma.contractTemplate.findUnique.mockResolvedValue({
        id: testTemplateId,
        organizationId: testOrgId,
        _count: { versions: 1 },
      })
      mockPrisma.member.findFirst.mockResolvedValue({ role: 'owner' })
      mockPrisma.generatedContract.count.mockResolvedValue(0)
      mockPrisma.contractTemplate.delete.mockResolvedValue({})

      const result = await deleteContractTemplate(testTemplateId)

      expect(result.success).toBe(true)
    })

    it('запрещает удаление если есть сгенерированные договоры', async () => {
      mockPrisma.contractTemplate.findUnique.mockResolvedValue({
        id: testTemplateId,
        organizationId: testOrgId,
        _count: { versions: 1 },
      })
      mockPrisma.member.findFirst.mockResolvedValue({ role: 'owner' })
      mockPrisma.generatedContract.count.mockResolvedValue(5)

      const result = await deleteContractTemplate(testTemplateId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('5 договоров')
      }
    })
  })
})
