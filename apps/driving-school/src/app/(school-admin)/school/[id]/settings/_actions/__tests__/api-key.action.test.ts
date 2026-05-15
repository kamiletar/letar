import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Phase 8.4: API-ключи — Unit-тесты для Server Actions
 *
 * Тестируемые функции:
 * - createApiKeyAction() — создание API-ключа
 * - revokeApiKeyAction() — отзыв ключа
 * - renameApiKeyAction() — переименование ключа
 * - deleteApiKeyAction() — удаление отозванного ключа
 * - getApiKeysAction() — список ключей
 *
 * Проверки:
 * - Генерация secure random ключа (32 байта)
 * - Хеширование ключа в БД
 * - Лимит ключей (MAX_API_KEYS_PER_SCHOOL = 10)
 * - Access control: owner, super_manager, manager
 * - Валидация прав доступа
 * - Проверка статусов
 */

// Моки
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getEnhancedPrisma: vi.fn(),
}))

vi.mock('@/lib/api-auth', () => ({
  generateApiKey: vi.fn(),
}))

import { generateApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import {
  createApiKeyAction,
  deleteApiKeyAction,
  getApiKeysAction,
  renameApiKeyAction,
  revokeApiKeyAction,
} from '../api-key.action'

// Типы для моков
interface MockUser {
  id: string
  email: string
  roles: string[]
}

interface MockMember {
  organizationId: string
  userId: string
  role: string
}

interface MockApiKey {
  id: string
  organizationId: string
  name: string
  keyHash: string
  keyPrefix: string
  status: 'ACTIVE' | 'REVOKED'
  createdAt: Date
  lastUsedAt: Date | null
  usageCount: number
  revokedAt: Date | null
  revokedById: string | null
}

// Константы
const SCHOOL_ID = 'school-123'
const USER_ID = 'user-456'
const KEY_ID = 'key-789'

// Моковые данные
const mockOwner: MockUser = {
  id: USER_ID,
  email: 'owner@test.com',
  roles: ['user'],
}

const mockMembership: MockMember = {
  organizationId: SCHOOL_ID,
  userId: USER_ID,
  role: 'owner',
}

const mockApiKey: MockApiKey = {
  id: KEY_ID,
  organizationId: SCHOOL_ID,
  name: 'Test API Key',
  keyHash: 'hashed_key',
  keyPrefix: 'ds_live_abcd1234...',
  status: 'ACTIVE',
  createdAt: new Date(),
  lastUsedAt: null,
  usageCount: 0,
  revokedAt: null,
  revokedById: null,
}

// Моковая БД
let mockDb: {
  member: {
    findUnique: ReturnType<typeof vi.fn>
  }
  apiKey: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  // Сброс всех моков
  vi.clearAllMocks()

  // Создаём моковую БД
  mockDb = {
    member: {
      findUnique: vi.fn(),
    },
    apiKey: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }

  // Настраиваем моки по умолчанию
  vi.mocked(getSession).mockResolvedValue({ user: mockOwner } as never)
  vi.mocked(getEnhancedPrisma).mockReturnValue(mockDb as never)
  mockDb.member.findUnique.mockResolvedValue(mockMembership)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createApiKeyAction', () => {
  beforeEach(() => {
    // Мок для generateApiKey
    vi.mocked(generateApiKey).mockReturnValue({
      key: 'ds_live_abcd1234567890abcdef1234567890abcdef1234567890ab',
      keyHash: 'hashed_key_value',
      keyPrefix: 'ds_live_abcd1234...',
    })

    mockDb.apiKey.count.mockResolvedValue(0)
    mockDb.apiKey.create.mockResolvedValue({
      id: KEY_ID,
      name: 'Test Key',
      keyPrefix: 'ds_live_abcd1234...',
      status: 'ACTIVE',
      createdAt: new Date(),
      lastUsedAt: null,
      usageCount: 0,
    })
  })

  it('должен создать API-ключ с secure random генерацией', async () => {
    const result = await createApiKeyAction(SCHOOL_ID, 'Production API')

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.fullKey).toBe('ds_live_abcd1234567890abcdef1234567890abcdef1234567890ab')
    expect(result.apiKey.name).toBe('Test Key')
    expect(result.apiKey.status).toBe('ACTIVE')
    expect(generateApiKey).toHaveBeenCalledOnce()
  })

  it('должен хешировать ключ перед сохранением в БД', async () => {
    await createApiKeyAction(SCHOOL_ID, 'Test Key')

    expect(mockDb.apiKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        keyHash: 'hashed_key_value',
        keyPrefix: 'ds_live_abcd1234...',
      }),
      select: expect.any(Object),
    })
  })

  it('должен проверять лимит ключей (MAX = 10)', async () => {
    mockDb.apiKey.count.mockResolvedValue(10) // Уже 10 ключей

    const result = await createApiKeyAction(SCHOOL_ID, 'New Key')

    expect(result).toEqual({
      success: false,
      error: 'LIMIT_EXCEEDED',
    })
    expect(mockDb.apiKey.create).not.toHaveBeenCalled()
  })

  it('должен разрешать создание owner', async () => {
    mockDb.member.findUnique.mockResolvedValue({
      ...mockMembership,
      role: 'owner',
    })

    const result = await createApiKeyAction(SCHOOL_ID, 'Owner Key')

    expect(result.success).toBe(true)
  })

  it('должен разрешать создание super_manager', async () => {
    mockDb.member.findUnique.mockResolvedValue({
      ...mockMembership,
      role: 'super_manager',
    })

    const result = await createApiKeyAction(SCHOOL_ID, 'Manager Key')

    expect(result.success).toBe(true)
  })

  it('должен запрещать создание instructor', async () => {
    mockDb.member.findUnique.mockResolvedValue({
      ...mockMembership,
      role: 'instructor',
    })

    const result = await createApiKeyAction(SCHOOL_ID, 'Instructor Key')

    expect(result).toEqual({
      success: false,
      error: 'NOT_ADMIN',
    })
  })

  it('должен возвращать ошибку если нет сессии', async () => {
    vi.mocked(getSession).mockResolvedValue(null as never)

    const result = await createApiKeyAction(SCHOOL_ID, 'Test')

    expect(result).toEqual({
      success: false,
      error: 'UNAUTHORIZED',
    })
  })
})

describe('revokeApiKeyAction', () => {
  beforeEach(() => {
    mockDb.apiKey.findUnique.mockResolvedValue(mockApiKey)
    mockDb.apiKey.update.mockResolvedValue({
      ...mockApiKey,
      status: 'REVOKED',
      revokedAt: new Date(),
      revokedById: USER_ID,
    })
  })

  it('должен отзывать ключ', async () => {
    const result = await revokeApiKeyAction(SCHOOL_ID, KEY_ID)

    expect(result).toEqual({ success: true })
    expect(mockDb.apiKey.update).toHaveBeenCalledWith({
      where: { id: KEY_ID },
      data: {
        status: 'REVOKED',
        revokedAt: expect.any(Date),
        revokedById: USER_ID,
      },
    })
  })

  it('должен проверять что ключ принадлежит школе', async () => {
    mockDb.apiKey.findUnique.mockResolvedValue({
      ...mockApiKey,
      organizationId: 'other-school',
    })

    const result = await revokeApiKeyAction(SCHOOL_ID, KEY_ID)

    expect(result).toEqual({
      success: false,
      error: 'NOT_FOUND',
    })
  })

  it('должен запрещать повторный отзыв', async () => {
    mockDb.apiKey.findUnique.mockResolvedValue({
      ...mockApiKey,
      status: 'REVOKED',
    })

    const result = await revokeApiKeyAction(SCHOOL_ID, KEY_ID)

    expect(result).toEqual({
      success: false,
      error: 'ALREADY_REVOKED',
    })
  })

  it('должен требовать авторизацию', async () => {
    vi.mocked(getSession).mockResolvedValue(null as never)

    const result = await revokeApiKeyAction(SCHOOL_ID, KEY_ID)

    expect(result).toEqual({
      success: false,
      error: 'UNAUTHORIZED',
    })
  })
})

describe('getApiKeysAction', () => {
  beforeEach(() => {
    mockDb.apiKey.findMany.mockResolvedValue([
      {
        id: 'key-1',
        name: 'Production',
        keyPrefix: 'ds_live_abc...',
        status: 'ACTIVE',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        usageCount: 100,
      },
      {
        id: 'key-2',
        name: 'Development',
        keyPrefix: 'ds_live_def...',
        status: 'REVOKED',
        createdAt: new Date(),
        lastUsedAt: null,
        usageCount: 0,
      },
    ])
  })

  it('должен возвращать список ключей', async () => {
    const result = await getApiKeysAction(SCHOOL_ID)

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.apiKeys).toHaveLength(2)
    expect(result.apiKeys[0].name).toBe('Production')
    expect(result.apiKeys[1].status).toBe('REVOKED')
  })

  it('должен требовать админские права', async () => {
    mockDb.member.findUnique.mockResolvedValue({
      ...mockMembership,
      role: 'instructor',
    })

    const result = await getApiKeysAction(SCHOOL_ID)

    expect(result).toEqual({
      success: false,
      error: 'NOT_ADMIN',
    })
  })

  it('должен проверять авторизацию', async () => {
    vi.mocked(getSession).mockResolvedValue(null as never)

    const result = await getApiKeysAction(SCHOOL_ID)

    expect(result).toEqual({
      success: false,
      error: 'UNAUTHORIZED',
    })
  })
})

describe('deleteApiKeyAction', () => {
  beforeEach(() => {
    mockDb.apiKey.findUnique.mockResolvedValue({
      ...mockApiKey,
      status: 'REVOKED',
    })
    mockDb.apiKey.delete.mockResolvedValue(mockApiKey)
  })

  it('должен удалять отозванный ключ', async () => {
    const result = await deleteApiKeyAction(SCHOOL_ID, KEY_ID)

    expect(result).toEqual({ success: true })
    expect(mockDb.apiKey.delete).toHaveBeenCalledWith({
      where: { id: KEY_ID },
    })
  })

  it('должен запрещать удаление активного ключа', async () => {
    mockDb.apiKey.findUnique.mockResolvedValue({
      ...mockApiKey,
      status: 'ACTIVE',
    })

    const result = await deleteApiKeyAction(SCHOOL_ID, KEY_ID)

    expect(result).toEqual({
      success: false,
      error: 'MUST_REVOKE_FIRST',
    })
    expect(mockDb.apiKey.delete).not.toHaveBeenCalled()
  })

  it('должен проверять что ключ принадлежит школе', async () => {
    mockDb.apiKey.findUnique.mockResolvedValue({
      ...mockApiKey,
      organizationId: 'other-school',
      status: 'REVOKED',
    })

    const result = await deleteApiKeyAction(SCHOOL_ID, KEY_ID)

    expect(result).toEqual({
      success: false,
      error: 'NOT_FOUND',
    })
  })
})

describe('renameApiKeyAction', () => {
  beforeEach(() => {
    mockDb.apiKey.findUnique.mockResolvedValue(mockApiKey)
    mockDb.apiKey.update.mockResolvedValue({
      ...mockApiKey,
      name: 'New Name',
    })
  })

  it('должен переименовывать ключ', async () => {
    const result = await renameApiKeyAction(SCHOOL_ID, KEY_ID, 'Production API')

    expect(result).toEqual({ success: true })
    expect(mockDb.apiKey.update).toHaveBeenCalledWith({
      where: { id: KEY_ID },
      data: {
        name: 'Production API',
      },
    })
  })

  it('должен обрезать пробелы в названии', async () => {
    await renameApiKeyAction(SCHOOL_ID, KEY_ID, '  Spaced Name  ')

    expect(mockDb.apiKey.update).toHaveBeenCalledWith({
      where: { id: KEY_ID },
      data: {
        name: 'Spaced Name',
      },
    })
  })

  it('должен использовать "API Key" если название пустое', async () => {
    await renameApiKeyAction(SCHOOL_ID, KEY_ID, '   ')

    expect(mockDb.apiKey.update).toHaveBeenCalledWith({
      where: { id: KEY_ID },
      data: {
        name: 'API Key',
      },
    })
  })

  it('должен проверять что ключ принадлежит школе', async () => {
    mockDb.apiKey.findUnique.mockResolvedValue({
      ...mockApiKey,
      organizationId: 'other-school',
    })

    const result = await renameApiKeyAction(SCHOOL_ID, KEY_ID, 'New Name')

    expect(result).toEqual({
      success: false,
      error: 'NOT_FOUND',
    })
  })
})
