import { UserRole } from '@/generated/prisma'
import type { SessionWithRole, UserWithRole } from '@/lib/auth'

/**
 * Создает мок сессии для пользователя с ролью USER
 */
export function mockUserSession(overrides?: Partial<SessionWithRole>): SessionWithRole {
  return {
    session: {
      id: 'session-test-id',
      userId: 'user-test-id',
      token: 'mock-token',
      expiresAt: new Date('2030-12-31T23:59:59.999Z'),
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: {
      id: 'user-test-id',
      email: 'user@test.com',
      name: 'Test User',
      role: UserRole.USER,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  }
}

/**
 * Создает мок сессии для пользователя с ролью ADMIN
 */
export function mockAdminSession(overrides?: Partial<SessionWithRole>): SessionWithRole {
  return {
    session: {
      id: 'session-admin-id',
      userId: 'admin-test-id',
      token: 'mock-admin-token',
      expiresAt: new Date('2030-12-31T23:59:59.999Z'),
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: {
      id: 'admin-test-id',
      email: 'admin@test.com',
      name: 'Test Admin',
      role: UserRole.ADMIN,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  }
}

/**
 * Создает мок сессии с кастомными данными
 */
export function mockSession(
  userId: string,
  email: string,
  role: UserRole = UserRole.USER,
  overrides?: Partial<SessionWithRole>
): SessionWithRole {
  return {
    session: {
      id: `session-${userId}`,
      userId,
      token: `mock-token-${userId}`,
      expiresAt: new Date('2030-12-31T23:59:59.999Z'),
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: {
      id: userId,
      email,
      name: email.split('@')[0],
      role,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  }
}

/**
 * Создает мок пользователя для тестов
 */
export function mockUser(overrides?: Partial<UserWithRole>): UserWithRole {
  return {
    id: 'user-test-id',
    email: 'user@test.com',
    name: 'Test User',
    role: 'USER',
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Возвращает null для неавторизованного пользователя
 */
export function mockUnauthenticated(): null {
  return null
}
