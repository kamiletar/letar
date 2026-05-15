import { beforeEach, describe, expect, it, vi } from 'vitest'

// Мок CUID для тестов
const MOCK_CLIENT_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxxx'
const MOCK_RESULT_ID = 'clyyyyyyyyyyyyyyyyyyyyyyyyy'

// Моки модулей
const mockClientFindUnique = vi.fn()
const mockPracticeFindUnique = vi.fn()
const mockResultCreate = vi.fn()
const mockResultUpdate = vi.fn()
const mockResultFindUnique = vi.fn()
const mockResultDelete = vi.fn()
const mockDb = {
  client: { findUnique: (...args: unknown[]) => mockClientFindUnique(...args) },
  practice: { findUnique: (...args: unknown[]) => mockPracticeFindUnique(...args) },
  result: {
    create: (...args: unknown[]) => mockResultCreate(...args),
    update: (...args: unknown[]) => mockResultUpdate(...args),
    findUnique: (...args: unknown[]) => mockResultFindUnique(...args),
    delete: (...args: unknown[]) => mockResultDelete(...args),
  },
}

const mockGetSession = vi.fn()
vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}))

vi.mock('@/lib/db', () => ({
  getEnhancedPrisma: () => mockDb,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Импортируем после моков
const { createResult, updateResult } = await import('../result.actions')

const validCreateInput = {
  clientId: MOCK_CLIENT_ID,
  level: 'energy' as const,
  metric: 'Уровень корневой чакры',
  value: 7,
}

describe('createResult', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', role: 'SPECIALIST' },
    })
    mockClientFindUnique.mockResolvedValue({ id: MOCK_CLIENT_ID, specialistId: 'user-1' })
    mockResultCreate.mockResolvedValue({ id: MOCK_RESULT_ID })
  })

  it('успешно создаёт результат с валидными данными', async () => {
    const result = await createResult(validCreateInput)
    expect(result.success).toBe(true)
  })

  it('возвращает fieldErrors при невалидных данных', async () => {
    const result = await createResult({
      ...validCreateInput,
      value: 0, // за пределами 1-10
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors).toBeDefined()
  })

  it('возвращает ошибку если клиент не найден', async () => {
    mockClientFindUnique.mockResolvedValueOnce(null)
    const result = await createResult(validCreateInput)
    expect(result.success).toBe(false)
    expect(result.fieldErrors?.clientId).toBeDefined()
  })

  it('требует роль SPECIALIST или ADMIN', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: 'user-1', role: 'CLIENT' },
    })
    await expect(createResult(validCreateInput)).rejects.toThrow('Forbidden')
  })

  it('требует аутентификацию', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    await expect(createResult(validCreateInput)).rejects.toThrow('Unauthorized')
  })
})

describe('updateResult', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', role: 'SPECIALIST' },
    })
    mockResultFindUnique.mockResolvedValue({
      id: MOCK_RESULT_ID,
      clientId: MOCK_CLIENT_ID,
      client: { specialistId: 'user-1' },
    })
    mockResultUpdate.mockResolvedValue({ id: MOCK_RESULT_ID })
  })

  it('успешно обновляет результат', async () => {
    const result = await updateResult({
      id: MOCK_RESULT_ID,
      value: 8,
    })
    expect(result.success).toBe(true)
  })

  it('возвращает ошибку если результат не найден', async () => {
    mockResultFindUnique.mockResolvedValueOnce(null)
    const result = await updateResult({
      id: MOCK_RESULT_ID,
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('возвращает fieldErrors при невалидном ID', async () => {
    const result = await updateResult({
      id: 'invalid-id',
      value: 5,
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors).toBeDefined()
  })
})
