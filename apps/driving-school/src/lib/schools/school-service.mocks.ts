/**
 * @file school-service.mocks.ts
 * @description Общие моки и тестовые данные для тестов школьного сервиса
 * @version 0.163.0
 */

import { vi } from 'vitest'
import type { InvitationStatus, MemberRole, SchoolRepository } from './school-service'

// ============================================================================
// Мок-репозиторий
// ============================================================================

/**
 * Создаёт мок-репозиторий с заглушками для всех методов
 * @param overrides - Переопределение отдельных методов
 */
export function createMockRepo(overrides: Partial<SchoolRepository> = {}): SchoolRepository {
  return {
    createSchool: vi.fn(),
    updateSchool: vi.fn(),
    getSchoolById: vi.fn(),
    getSchoolsByUserId: vi.fn(),
    getSchoolMembers: vi.fn(),
    getMembership: vi.fn(),
    createMembership: vi.fn(),
    deleteMembership: vi.fn(),
    updateMembershipRole: vi.fn(),
    countOwners: vi.fn().mockResolvedValue(2),
    createInvitation: vi.fn(),
    getInvitationById: vi.fn(),
    updateInvitation: vi.fn(),
    deleteExpiredInvitations: vi.fn(),
    ...overrides,
  }
}

// ============================================================================
// Тестовые данные
// ============================================================================

/**
 * Тестовая школа (организация)
 */
export const mockSchool = {
  id: 'school-1',
  name: 'Автошкола "Успех"',
  logo: null,
  description: 'Лучшая автошкола города',
  address: 'ул. Ленина, 1',
  phone: '+79001234567',
  email: 'school@example.com',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

/**
 * Тестовое членство в школе (Member)
 */
export const mockMembership = {
  id: 'membership-1',
  organizationId: 'school-1',
  userId: 'user-1',
  role: 'owner' as MemberRole,
  createdAt: new Date('2024-01-01'),
}

/**
 * Тестовое приглашение в школу (Invitation)
 */
export const mockInvitation = {
  id: 'invitation-1',
  token: null,
  organizationId: 'school-1',
  email: 'new@example.com',
  role: 'instructor' as MemberRole,
  status: 'pending' as InvitationStatus,
  inviterId: 'user-1',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 дней
  createdAt: new Date(),
}
