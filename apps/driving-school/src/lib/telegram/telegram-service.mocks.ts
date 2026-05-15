/**
 * Моки и тестовые данные для тестов Telegram-сервиса
 */

import type { LessonStatus, UserRole } from '@letar/driving-school-db/prisma'
import { vi } from 'vitest'
import type {
  LessonData,
  SlotData,
  TelegramLinkData,
  TelegramLinkTokenData,
  TelegramRepository,
  UserData,
} from './telegram-service'

// === Мок репозиторий ===

export function createMockRepo(overrides: Partial<TelegramRepository> = {}): TelegramRepository {
  return {
    createLinkToken: vi.fn().mockResolvedValue({ id: 'token-1' }),
    getLinkTokenByToken: vi.fn().mockResolvedValue(null),
    markTokenAsUsed: vi.fn().mockResolvedValue(undefined),
    deleteOldTokensByUserId: vi.fn().mockResolvedValue(undefined),
    getTelegramLinkByUserId: vi.fn().mockResolvedValue(null),
    getTelegramLinkByTelegramId: vi.fn().mockResolvedValue(null),
    createTelegramLink: vi.fn().mockResolvedValue({ id: 'link-1' }),
    updateTelegramLink: vi.fn().mockResolvedValue(undefined),
    deleteTelegramLink: vi.fn().mockResolvedValue(undefined),
    getUserById: vi.fn().mockResolvedValue(null),
    getLessonById: vi.fn().mockResolvedValue(null),
    updateLessonStatus: vi.fn().mockResolvedValue(undefined),
    getUpcomingLessonsByStudentId: vi.fn().mockResolvedValue([]),
    getUpcomingLessonsByInstructorId: vi.fn().mockResolvedValue([]),
    getUpcomingSlotsByInstructorId: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

// === Тестовые данные ===

export const mockUser: UserData = {
  id: 'user-1',
  name: 'Иван Иванов',
  email: 'ivan@example.com',
  roles: ['USER'] as UserRole[],
}

export const mockInstructor: UserData = {
  id: 'instructor-1',
  name: 'Пётр Петров',
  email: 'petr@example.com',
  roles: ['FREELANCE_INSTRUCTOR'] as UserRole[],
}

export const mockLinkToken: TelegramLinkTokenData = {
  id: 'token-1',
  userId: 'user-1',
  token: 'abc123',
  expiresAt: new Date(Date.now() + 3600000), // +1 час
  usedAt: null,
  createdAt: new Date(),
}

export const mockTelegramLink: TelegramLinkData = {
  id: 'link-1',
  userId: 'user-1',
  telegramId: BigInt(123456789),
  username: 'ivanov',
  firstName: 'Иван',
  linkedAt: new Date(),
}

export const mockSlot: SlotData = {
  id: 'slot-1',
  startTime: new Date('2025-12-10T10:00:00'),
  endTime: new Date('2025-12-10T11:30:00'),
}

export const mockLesson: LessonData = {
  id: 'lesson-1',
  slotId: 'slot-1',
  studentId: 'user-1',
  instructorId: 'instructor-1',
  status: 'PENDING' as LessonStatus,
  slot: mockSlot,
  student: mockUser,
  instructor: mockInstructor,
}
