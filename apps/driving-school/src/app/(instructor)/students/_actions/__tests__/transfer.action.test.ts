import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TransferReason, TransferType } from '@letar/driving-school-db/prisma'

import {
  acceptTransferAction,
  cancelTransferAction,
  initiateTransferAction,
  reclaimStudentAction,
  rejectTransferAction,
} from '../transfer.action'

// === Моки ===

// Определяем моки через vi.hoisted() для избежания hoisting проблем
const { mockPrisma, mockTransferLib, mockNotifications, mockChatSync, mockRepository } = vi.hoisted(() => {
  const mockPrisma = {
    studentInstructorConnection: {
      findUnique: vi.fn(),
    },
    instructorProfile: {
      findUnique: vi.fn(),
    },
  }

  const mockTransferLib = {
    initiateTransfer: vi.fn(),
    acceptTransfer: vi.fn(),
    rejectTransfer: vi.fn(),
    cancelTransfer: vi.fn(),
    reclaimStudent: vi.fn(),
    getTransfersByInstructor: vi.fn(),
    getPendingTransfersForInstructor: vi.fn(),
  }

  const mockNotifications = {
    notifyTransferInitiated: vi.fn().mockResolvedValue(undefined),
    notifyTransferAccepted: vi.fn().mockResolvedValue(undefined),
    notifyTransferRejected: vi.fn().mockResolvedValue(undefined),
    notifyStudentReclaimed: vi.fn().mockResolvedValue(undefined),
  }

  const mockChatSync = {
    syncChatsOnTransferAccepted: vi.fn().mockResolvedValue(undefined),
    syncChatsOnStudentReclaimed: vi.fn().mockResolvedValue(undefined),
  }

  const mockRepository = {
    createTransferRepository: vi.fn(() => ({})),
    getTransferWithRelations: vi.fn(),
  }

  return { mockPrisma, mockTransferLib, mockNotifications, mockChatSync, mockRepository }
})

// Mock для action-helpers (withInstructor)
// Используем 'unknown' вместо 'any' для соответствия правилам oxlint no-explicit-any
vi.mock('@/lib/action-helpers', () => ({
  withInstructor: vi.fn((callback: (user: unknown, instructorProfileId: string) => Promise<unknown>) => {
    const mockUser = { id: 'user-instructor-1', role: 'instructor' }
    const mockInstructorProfileId = 'instructor-profile-1'
    return callback(mockUser, mockInstructorProfileId)
  }),
}))

// Mock для db (getEnhancedPrisma и prisma)
vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

// Mock для @/lib/transfers
vi.mock('@/lib/transfers', () => mockTransferLib)

// Mock для transfer-notifications (../../_lib/ — из __tests__/ нужно подняться на 2 уровня)
vi.mock('../../_lib/transfer-notifications', () => mockNotifications)

// Mock для transfer-chat-sync
vi.mock('../../_lib/transfer-chat-sync', () => mockChatSync)

// Mock для transfer-repository
vi.mock('../../_lib/transfer-repository', () => mockRepository)

// Mock для revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// === Тестовые данные ===

const testConnectionId = 'connection-123'
const testInstructorId = 'instructor-456'
const testTransferId = 'transfer-789'
const testUserId = 'user-instructor-1'
const testStudentId = 'student-123'

describe('transfer.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === Группа 1: Инициирование передачи ===

  describe('Группа 1: Инициирование передачи', () => {
    it('initiateTransferAction() — успешная инициация передачи', async () => {
      // Arrange
      mockPrisma.studentInstructorConnection.findUnique.mockResolvedValue({
        id: testConnectionId,
        instructorId: 'instructor-profile-1',
        studentId: testStudentId,
        instructor: {
          userId: testUserId,
          user: { id: testUserId, name: 'Инструктор Иван' },
        },
        student: {
          user: { id: 'student-user-1', name: 'Студент Петр' },
        },
      })

      mockPrisma.instructorProfile.findUnique.mockResolvedValue({
        id: testInstructorId,
        userId: 'user-instructor-2',
        user: { id: 'user-instructor-2', name: 'Инструктор Мария' },
      })

      mockTransferLib.initiateTransfer.mockResolvedValue({
        success: true,
        transferId: testTransferId,
      })

      const params = {
        connectionId: testConnectionId,
        toInstructorId: testInstructorId,
        type: 'PERMANENT' as TransferType,
        reason: 'SCHEDULE_CONFLICT' as TransferReason,
        transferBalance: true,
      }

      // Act
      const result = await initiateTransferAction(params)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.transferId).toBe(testTransferId)
      }

      // Проверяем, что вызвана core функция
      expect(mockTransferLib.initiateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionId: testConnectionId,
          toInstructorId: testInstructorId,
          type: 'PERMANENT',
          reason: 'SCHEDULE_CONFLICT',
          transferBalance: true,
        })
      )

      // Проверяем, что отправлено уведомление
      expect(mockNotifications.notifyTransferInitiated).toHaveBeenCalled()
    })

    it('initiateTransferAction() — ошибка если связь не принадлежит инструктору', async () => {
      // Arrange
      mockPrisma.studentInstructorConnection.findUnique.mockResolvedValue({
        id: testConnectionId,
        instructor: {
          userId: 'another-user-id', // Другой пользователь!
        },
      })

      const params = {
        connectionId: testConnectionId,
        toInstructorId: testInstructorId,
        type: 'PERMANENT' as TransferType,
        reason: 'SCHEDULE_CONFLICT' as TransferReason,
        transferBalance: true,
      }

      // Act
      const result = await initiateTransferAction(params)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не принадлежит вам')
      }
      expect(mockTransferLib.initiateTransfer).not.toHaveBeenCalled()
    })

    it('initiateTransferAction() — ошибка если получатель не найден', async () => {
      // Arrange
      mockPrisma.studentInstructorConnection.findUnique.mockResolvedValue({
        id: testConnectionId,
        instructor: {
          userId: testUserId,
          user: { id: testUserId, name: 'Инструктор Иван' },
        },
        student: {
          user: { id: 'student-user-1', name: 'Студент Петр' },
        },
      })

      mockPrisma.instructorProfile.findUnique.mockResolvedValue(null) // Получатель не найден

      const params = {
        connectionId: testConnectionId,
        toInstructorId: testInstructorId,
        type: 'PERMANENT' as TransferType,
        reason: 'SCHEDULE_CONFLICT' as TransferReason,
        transferBalance: true,
      }

      // Act
      const result = await initiateTransferAction(params)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не найден')
      }
      expect(mockTransferLib.initiateTransfer).not.toHaveBeenCalled()
    })
  })

  // === Группа 2: Принятие передачи ===

  describe('Группа 2: Принятие передачи', () => {
    it('acceptTransferAction() — успешное принятие передачи', async () => {
      // Arrange
      const transferData = {
        transfer: {
          id: testTransferId,
          toInstructorId: 'instructor-profile-1',
        },
        fromConnection: {
          instructorId: 'instructor-profile-2',
          studentId: testStudentId,
          instructor: {
            userId: 'user-instructor-2',
            user: { id: 'user-instructor-2', name: 'Инициатор' },
          },
          student: {
            user: { id: 'student-user-1', name: 'Студент' },
          },
        },
        toInstructor: {
          id: 'instructor-profile-1',
          userId: testUserId, // Текущий пользователь
          user: { id: testUserId, name: 'Получатель' },
        },
      }

      mockRepository.getTransferWithRelations.mockResolvedValue(transferData)

      mockTransferLib.acceptTransfer.mockResolvedValue({
        success: true,
        newConnectionId: 'new-connection-123',
      })

      // Act
      const result = await acceptTransferAction(testTransferId)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.newConnectionId).toBe('new-connection-123')
      }

      // Проверяем вызов core функции
      expect(mockTransferLib.acceptTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ transferId: testTransferId })
      )

      // Проверяем sync чатов
      expect(mockChatSync.syncChatsOnTransferAccepted).toHaveBeenCalled()

      // Проверяем уведомление
      expect(mockNotifications.notifyTransferAccepted).toHaveBeenCalled()
    })

    it('acceptTransferAction() — ошибка если пользователь не получатель', async () => {
      // Arrange
      const transferData = {
        transfer: {
          id: testTransferId,
          toInstructorId: 'instructor-profile-1',
        },
        fromConnection: {
          instructor: {
            userId: 'user-instructor-2',
          },
          student: {
            user: { id: 'student-user-1' },
          },
        },
        toInstructor: {
          id: 'instructor-profile-1',
          userId: 'another-user-id', // Другой пользователь!
        },
      }

      mockRepository.getTransferWithRelations.mockResolvedValue(transferData)

      // Act
      const result = await acceptTransferAction(testTransferId)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не являетесь получателем')
      }
      expect(mockTransferLib.acceptTransfer).not.toHaveBeenCalled()
    })
  })

  // === Группа 3: Отклонение передачи ===

  describe('Группа 3: Отклонение передачи', () => {
    it('rejectTransferAction() — успешное отклонение передачи', async () => {
      // Arrange
      const transferData = {
        transfer: {
          id: testTransferId,
          toInstructorId: 'instructor-profile-1',
        },
        fromConnection: {
          instructorId: 'instructor-profile-2',
          studentId: testStudentId,
          instructor: {
            userId: 'user-instructor-2',
            user: { id: 'user-instructor-2', name: 'Инициатор' },
          },
          student: {
            user: { id: 'student-user-1', name: 'Студент' },
          },
        },
        toInstructor: {
          id: 'instructor-profile-1',
          userId: testUserId,
          user: { id: testUserId, name: 'Получатель' },
        },
      }

      mockRepository.getTransferWithRelations.mockResolvedValue(transferData)

      mockTransferLib.rejectTransfer.mockResolvedValue({
        success: true,
      })

      // Act
      const result = await rejectTransferAction(testTransferId)

      // Assert
      expect(result.success).toBe(true)

      // Проверяем вызов core функции
      expect(mockTransferLib.rejectTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ transferId: testTransferId })
      )

      // Проверяем уведомление
      expect(mockNotifications.notifyTransferRejected).toHaveBeenCalled()
    })
  })

  // === Группа 4: Отмена передачи ===

  describe('Группа 4: Отмена передачи', () => {
    it('cancelTransferAction() — успешная отмена инициатором', async () => {
      // Arrange
      const transferData = {
        fromConnection: {
          instructor: {
            userId: testUserId, // Текущий пользователь — инициатор
          },
        },
      }

      mockRepository.getTransferWithRelations.mockResolvedValue(transferData)

      mockTransferLib.cancelTransfer.mockResolvedValue({
        success: true,
      })

      // Act
      const result = await cancelTransferAction(testTransferId)

      // Assert
      expect(result.success).toBe(true)
      expect(mockTransferLib.cancelTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ transferId: testTransferId })
      )
    })

    it('cancelTransferAction() — ошибка если пользователь не инициатор', async () => {
      // Arrange
      const transferData = {
        fromConnection: {
          instructor: {
            userId: 'another-user-id', // Другой пользователь!
          },
        },
      }

      mockRepository.getTransferWithRelations.mockResolvedValue(transferData)

      // Act
      const result = await cancelTransferAction(testTransferId)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не принадлежит вам')
      }
      expect(mockTransferLib.cancelTransfer).not.toHaveBeenCalled()
    })
  })

  // === Группа 5: Возврат ученика ===

  describe('Группа 5: Возврат ученика', () => {
    it('reclaimStudentAction() — успешный возврат ученика', async () => {
      // Arrange
      const transferData = {
        fromConnection: {
          instructorId: 'instructor-profile-1',
          studentId: testStudentId,
          instructor: {
            userId: testUserId, // Текущий пользователь — инициатор
            user: { id: testUserId, name: 'Оригинальный инструктор' },
          },
          student: {
            user: { id: 'student-user-1', name: 'Студент' },
          },
        },
        toInstructor: {
          id: 'instructor-profile-2',
          userId: 'user-instructor-2',
          user: { id: 'user-instructor-2', name: 'Временный инструктор' },
        },
      }

      mockRepository.getTransferWithRelations.mockResolvedValue(transferData)

      mockTransferLib.reclaimStudent.mockResolvedValue({
        success: true,
      })

      // Act
      const result = await reclaimStudentAction(testTransferId)

      // Assert
      expect(result.success).toBe(true)

      // Проверяем вызов core функции
      expect(mockTransferLib.reclaimStudent).toHaveBeenCalledWith(
        expect.objectContaining({ transferId: testTransferId })
      )

      // Проверяем sync чатов
      expect(mockChatSync.syncChatsOnStudentReclaimed).toHaveBeenCalled()

      // Проверяем уведомление
      expect(mockNotifications.notifyStudentReclaimed).toHaveBeenCalled()
    })
  })

  // === Группа 6: Access Control ===

  describe('Группа 6: Access Control', () => {
    it('Access control — только инструктор может инициировать передачу', async () => {
      // Arrange
      const { withInstructor } = await import('@/lib/action-helpers')

      mockPrisma.studentInstructorConnection.findUnique.mockResolvedValue({
        id: testConnectionId,
        instructor: {
          userId: testUserId,
          user: { id: testUserId, name: 'Инструктор' },
        },
        student: {
          user: { id: 'student-user-1', name: 'Студент' },
        },
      })

      mockPrisma.instructorProfile.findUnique.mockResolvedValue({
        id: testInstructorId,
        userId: 'user-instructor-2',
        user: { id: 'user-instructor-2', name: 'Получатель' },
      })

      mockTransferLib.initiateTransfer.mockResolvedValue({
        success: true,
        transferId: testTransferId,
      })

      const params = {
        connectionId: testConnectionId,
        toInstructorId: testInstructorId,
        type: 'PERMANENT' as TransferType,
        reason: 'SCHEDULE_CONFLICT' as TransferReason,
        transferBalance: true,
      }

      // Act
      await initiateTransferAction(params)

      // Assert
      expect(withInstructor).toHaveBeenCalledWith(expect.any(Function))
    })
  })
})
