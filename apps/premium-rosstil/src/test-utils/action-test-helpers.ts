/**
 * Shared утилиты для тестирования server actions.
 *
 * Стандартные моки для авторизации, БД и next/cache.
 * Используй vi.hoisted() для определения mockPrisma ДО импортов.
 */
import { vi } from 'vitest'

// === Стандартные пользователи ===

export const MOCK_USER = {
  id: 'user-1',
  name: 'Тест Юзер',
  email: 'user@test.ru',
  role: 'USER' as const,
  emailVerified: true,
  image: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

export const MOCK_ADMIN_USER = {
  id: 'admin-1',
  name: 'Тест Админ',
  email: 'admin@test.ru',
  role: 'ADMIN' as const,
  emailVerified: true,
  image: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

export const MOCK_SELLER_USER = {
  id: 'seller-1',
  name: 'Тест Продавец',
  email: 'seller@test.ru',
  role: 'SELLER' as const,
  emailVerified: true,
  image: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

// === Фабрика mock Prisma ===

type MockMethods = Record<string, ReturnType<typeof vi.fn>>
type MockModels = Record<string, MockMethods>

/**
 * Создаёт mock Prisma клиент с нужными моделями и методами.
 *
 * @example
 * const mockPrisma = createMockPrisma({
 *   order: ['findUnique', 'create', 'update'],
 *   user: ['findUnique', 'update'],
 * })
 */
export function createMockPrisma(models: Record<string, string[]>): MockModels {
  const prisma: MockModels = {}
  for (const [model, methods] of Object.entries(models)) {
    prisma[model] = {}
    for (const method of methods) {
      prisma[model][method] = vi.fn()
    }
  }
  return prisma
}

/**
 * Создаёт mock Prisma с поддержкой $transaction.
 * $transaction вызывает callback с тем же mock prisma.
 *
 * @example
 * const mockPrisma = createMockPrismaWithTransaction({
 *   return: ['findUnique', 'update'],
 *   subOrder: ['update'],
 * })
 */
export function createMockPrismaWithTransaction(models: Record<string, string[]>) {
  const prisma: Record<string, any> = createMockPrisma(models)
  prisma.$transaction = vi.fn((fn: (tx: any) => any) => fn(prisma))
  return prisma
}

// === Стандартные моки модулей ===

/**
 * Мок getSession — возвращает сессию с пользователем.
 * Используй: vi.mock('@/lib/auth', () => mockGetSession())
 */
export function mockGetSession(user: typeof MOCK_USER | typeof MOCK_ADMIN_USER | typeof MOCK_SELLER_USER = MOCK_USER) {
  return {
    getSession: vi.fn(async () => ({
      session: {
        id: 'session-1',
        userId: user.id,
        token: 'mock-token',
        expiresAt: new Date('2030-12-31'),
      },
      user,
    })),
    requireAuth: vi.fn(async () => user),
    requireAdmin: vi.fn(async () => user),
    requireSeller: vi.fn(async () => user),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }
}

/**
 * Мок auth с requireAuth — для action-тестов, использующих requireAuth.
 * Используй: vi.mock('@/lib/auth', () => mockRequireAuth())
 */
export function mockRequireAuth(user = MOCK_USER) {
  return mockGetSession(user)
}

/**
 * Мок auth с requireAdmin — для admin action-тестов.
 * Используй: vi.mock('@/lib/auth', () => mockRequireAdmin())
 */
export function mockRequireAdmin(user = MOCK_ADMIN_USER) {
  return mockGetSession(user)
}

/**
 * Мок auth с requireSeller — для seller action-тестов.
 * Используй: vi.mock('@/lib/auth', () => mockRequireSeller())
 */
export function mockRequireSeller(user = MOCK_SELLER_USER) {
  return mockGetSession(user)
}

/**
 * Мок getSession — возвращает null (не авторизован).
 */
export function mockGetSessionNull() {
  return {
    getSession: vi.fn(async () => null),
    requireAuth: vi.fn(async () => {
      throw new Error('Not authenticated')
    }),
    requireAdmin: vi.fn(async () => {
      throw new Error('Not authenticated')
    }),
    requireSeller: vi.fn(async () => {
      throw new Error('Not authenticated')
    }),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }
}

/**
 * Мок @/lib/db — prisma, getPrisma и getEnhancedPrisma возвращают mockPrisma.
 * Используй: vi.mock('@/lib/db', () => mockDb(mockPrisma))
 */
export function mockDb(mockPrisma: MockModels | Record<string, any>) {
  return {
    prisma: mockPrisma,
    getPrisma: vi.fn(() => mockPrisma),
    getEnhancedPrisma: vi.fn(() => mockPrisma),
  }
}
