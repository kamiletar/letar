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
  image: null,
  roles: ['USER'] as string[],
  isOnboardingComplete: true,
  hasStudentProfile: true,
  hasInstructorProfile: false,
}

export const MOCK_INSTRUCTOR_USER = {
  id: 'user-instructor-1',
  name: 'Инструктор Тестов',
  email: 'instructor@test.ru',
  image: null,
  roles: ['FREELANCE_INSTRUCTOR'] as string[],
  isOnboardingComplete: true,
  hasStudentProfile: false,
  hasInstructorProfile: true,
}

export const MOCK_OWNER_USER = {
  id: 'user-owner-1',
  name: 'Владелец Платформы',
  email: 'owner@test.ru',
  image: null,
  roles: ['OWNER'] as string[],
  isOnboardingComplete: true,
  hasStudentProfile: false,
  hasInstructorProfile: false,
}

// === Стандартные ID ===

export const MOCK_INSTRUCTOR_PROFILE_ID = 'instructor-profile-1'
export const MOCK_SCHOOL_ID = 'school-org-1'

// === Фабрика mock Prisma ===

type MockMethods = Record<string, ReturnType<typeof vi.fn>>
type MockModels = Record<string, MockMethods>

/**
 * Создаёт mock Prisma клиент с нужными моделями и методами.
 *
 * @example
 * const mockPrisma = createMockPrisma({
 *   lesson: ['findMany', 'create', 'update'],
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

// === Стандартные моки модулей ===

/**
 * Мок withInstructor — сразу вызывает callback с тестовым пользователем.
 * Используй с vi.mock('@/lib/action-helpers', () => mockWithInstructor())
 */
export function mockWithInstructor(user = MOCK_INSTRUCTOR_USER, instructorProfileId = MOCK_INSTRUCTOR_PROFILE_ID) {
  return {
    withInstructor: vi.fn((callback: (user: unknown, instructorProfileId: string) => Promise<unknown>) =>
      callback(user, instructorProfileId)
    ),
  }
}

/**
 * Мок withAuth — сразу вызывает callback с тестовым пользователем.
 * Используй с vi.mock('@/lib/action-helpers', () => mockWithAuth())
 */
export function mockWithAuth(user = MOCK_USER) {
  return {
    withAuth: vi.fn((callback: (user: unknown) => Promise<unknown>) => callback(user)),
  }
}

/**
 * Мок requireAuth — возвращает успешный результат.
 * Используй с vi.mock('@/lib/action-helpers', () => mockRequireAuth())
 */
export function mockRequireAuth(user = MOCK_USER) {
  return {
    requireAuth: vi.fn(async () => ({ success: true, user })),
  }
}

/**
 * Мок requireInstructor — возвращает успешный результат.
 */
export function mockRequireInstructor(user = MOCK_INSTRUCTOR_USER, instructorProfileId = MOCK_INSTRUCTOR_PROFILE_ID) {
  return {
    requireInstructor: vi.fn(async () => ({
      success: true,
      user,
      instructorProfileId,
    })),
  }
}

/**
 * Мок getSession — возвращает сессию с пользователем.
 * Используй с vi.mock('@/lib/auth', () => mockGetSession())
 */
export function mockGetSession(user = MOCK_USER) {
  return {
    getSession: vi.fn(async () => ({
      session: { id: 'session-1', userId: user.id },
      user,
    })),
  }
}

/**
 * Мок getSession — возвращает null (не авторизован).
 */
export function mockGetSessionNull() {
  return {
    getSession: vi.fn(async () => null),
  }
}

/**
 * Мок @/lib/db — prisma и getEnhancedPrisma возвращают mockPrisma.
 * Используй с vi.mock('@/lib/db', () => mockDb(mockPrisma))
 */
export function mockDb(mockPrisma: MockModels) {
  return {
    prisma: mockPrisma,
    getEnhancedPrisma: vi.fn(() => mockPrisma),
  }
}
