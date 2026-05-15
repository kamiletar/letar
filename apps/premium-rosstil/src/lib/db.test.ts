import { beforeEach, describe, expect, it, vi } from 'vitest'

// === Моки через vi.hoisted для корректного hoisting ===

const mocks = vi.hoisted(() => {
  const mockSetAuth = vi.fn()
  const mockUse = vi.fn(() => ({ $setAuth: mockSetAuth }))

  // Конструктор-совместимая реализация (НЕ arrow function)
  const mockInstance = {
    $use: mockUse,
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: { findMany: vi.fn() },
  }

  return { mockSetAuth, mockUse, mockInstance }
})

vi.mock('pg', () => ({ Pool: vi.fn() }))
vi.mock('kysely', () => ({ PostgresDialect: vi.fn() }))
vi.mock('@zenstackhq/orm', () => {
  // mockImplementation с обычной функцией для поддержки new
  const MockClient = vi.fn()
  MockClient.mockImplementation(function () {
    return mocks.mockInstance
  })
  return { ZenStackClient: MockClient }
})
vi.mock('@zenstackhq/plugin-policy', () => ({ PolicyPlugin: vi.fn() }))
vi.mock('@/generated/schema', () => ({ schema: { _tag: 'mock-schema' } }))

describe('db', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  })

  describe('getPrisma', () => {
    it('без DATABASE_URL → выбрасывает ошибку', async () => {
      delete process.env.DATABASE_URL

      const { getPrisma } = await import('./db')

      expect(() => getPrisma()).toThrow('DATABASE_URL')
    })

    it('с DATABASE_URL → создаёт ZenStackClient', async () => {
      const { getPrisma } = await import('./db')
      const client = getPrisma()

      expect(client).toBeDefined()
    })

    it('повторный вызов → возвращает тот же singleton', async () => {
      const { getPrisma } = await import('./db')
      const first = getPrisma()
      const second = getPrisma()

      expect(first).toBe(second)
    })
  })

  describe('getEnhancedPrisma', () => {
    it('вызывает $use(PolicyPlugin).$setAuth(user)', async () => {
      const { getEnhancedPrisma } = await import('./db')
      const user = { id: 'user-1', role: 'USER' as const }

      getEnhancedPrisma(user)

      expect(mocks.mockUse).toHaveBeenCalled()
      expect(mocks.mockSetAuth).toHaveBeenCalledWith(user)
    })

    it('null user → $setAuth(undefined)', async () => {
      const { getEnhancedPrisma } = await import('./db')

      getEnhancedPrisma(null)

      expect(mocks.mockSetAuth).toHaveBeenCalledWith(undefined)
    })

    it('без аргументов → $setAuth(undefined)', async () => {
      const { getEnhancedPrisma } = await import('./db')

      getEnhancedPrisma()

      expect(mocks.mockSetAuth).toHaveBeenCalledWith(undefined)
    })
  })

  describe('prisma proxy', () => {
    it('делегирует вызовы на getOrm()', async () => {
      const { prisma } = await import('./db')

      expect(prisma).toBeDefined()
      expect(typeof prisma.$connect).toBe('function')
    })
  })
})
