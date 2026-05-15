/**
 * Моки и тестовые данные для тестов сервиса передачи учеников
 */

import type { ConnectionStatus, TransferReason, TransferStatus, TransferType } from '@letar/driving-school-db/prisma'
import { vi } from 'vitest'
import type { ConnectionData, InstructorProfileData, TransferData, TransferRepository } from './transfer-service'

// === Мок репозитория ===

export const createMockRepository = (overrides: Partial<TransferRepository> = {}): TransferRepository => ({
  getConnectionById: vi.fn().mockResolvedValue(null),
  getInstructorProfileById: vi.fn().mockResolvedValue(null),
  getInstructorProfileByUserId: vi.fn().mockResolvedValue(null),
  getTransferById: vi.fn().mockResolvedValue(null),
  getActiveTransferByConnection: vi.fn().mockResolvedValue(null),
  createTransfer: vi.fn().mockResolvedValue({ id: 'transfer-1' }),
  updateTransfer: vi.fn().mockResolvedValue(undefined),
  updateConnectionStatus: vi.fn().mockResolvedValue(undefined),
  updateConnectionBalance: vi.fn().mockResolvedValue(undefined),
  createConnection: vi.fn().mockResolvedValue({ id: 'connection-new' }),
  getTransfersByFromInstructor: vi.fn().mockResolvedValue([]),
  getPendingTransfersByToInstructor: vi.fn().mockResolvedValue([]),
  ...overrides,
})

// === Тестовые данные ===

export const mockInstructorA: InstructorProfileData = {
  id: 'instructor-profile-a',
  userId: 'instructor-a',
}

export const mockInstructorB: InstructorProfileData = {
  id: 'instructor-profile-b',
  userId: 'instructor-b',
}

export const mockConnection: ConnectionData = {
  id: 'connection-1',
  studentId: 'student-profile-1',
  instructorId: 'instructor-profile-a',
  status: 'ACTIVE' as ConnectionStatus,
  isPrimary: true,
  prepaidLessons: 10,
  totalLessons: 20,
  completedLessons: 15,
  cancelledLessons: 3,
  noShowCount: 2,
  transferredFrom: null,
}

export const mockTransfer: TransferData = {
  id: 'transfer-1',
  fromConnectionId: 'connection-1',
  toInstructorId: 'instructor-profile-b',
  type: 'TEMPORARY' as TransferType,
  reason: 'VACATION' as TransferReason,
  transferBalance: true,
  status: 'PENDING' as TransferStatus,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  respondedAt: null,
  newConnectionId: null,
}
