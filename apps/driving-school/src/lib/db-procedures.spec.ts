/**
 * Тесты для Custom Procedures (ZenStack v3.2.0)
 *
 * Покрывает:
 * - Transfer procedures (initiateTransfer, acceptTransfer, rejectTransfer, cancelTransfer, reclaimStudent)
 * - Lesson procedures (confirmLesson, cancelLesson, completeLesson, markNoShow)
 * - Enrollment procedures (approveEnrollmentRequest, rejectEnrollmentRequest)
 */

import { describe, expect, it, vi } from 'vitest'

import { procedures } from './db-procedures'

// Мок клиента ZenStack
const createMockClient = (overrides = {}) => ({
  studentInstructorConnection: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  studentTransfer: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  instructorProfile: {
    findUnique: vi.fn(),
  },
  lesson: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  enrollmentRequest: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  ...overrides,
})

describe('Transfer Procedures', () => {
  describe('initiateTransfer', () => {
    it('должен создавать запрос на передачу', async () => {
      const mockClient = createMockClient()

      // Мок связи ученик-инструктор
      mockClient.studentInstructorConnection.findUnique.mockResolvedValue({
        id: 'conn-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        status: 'ACTIVE',
        isPrimary: true,
        prepaidLessons: 5,
        totalLessons: 10,
        completedLessons: 5,
        cancelledLessons: 0,
        noShowCount: 0,
      })

      // Мок профиля инструктора-получателя
      mockClient.instructorProfile.findUnique.mockResolvedValue({
        id: 'instructor-2',
        userId: 'user-2',
      })

      // Мок создания трансфера
      mockClient.studentTransfer.findFirst.mockResolvedValue(null) // нет активных трансферов
      mockClient.studentTransfer.create.mockResolvedValue({
        id: 'transfer-1',
      })

      const result = await procedures.initiateTransfer(mockClient, {
        connectionId: 'conn-1',
        toInstructorId: 'instructor-2',
        type: 'TEMPORARY',
        reason: 'VACATION',
        transferBalance: true,
      })

      expect(result.success).toBe(true)
      expect(result.transferId).toBe('transfer-1')
    })

    it('должен возвращать ошибку если связь не найдена', async () => {
      const mockClient = createMockClient()
      mockClient.studentInstructorConnection.findUnique.mockResolvedValue(null)

      const result = await procedures.initiateTransfer(mockClient, {
        connectionId: 'non-existent',
        toInstructorId: 'instructor-2',
        type: 'TEMPORARY',
        reason: 'VACATION',
        transferBalance: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('CONNECTION_NOT_FOUND')
    })
  })

  describe('acceptTransfer', () => {
    it('должен принимать передачу и создавать новую связь', async () => {
      const mockClient = createMockClient()

      // Мок трансфера
      mockClient.studentTransfer.findUnique.mockResolvedValue({
        id: 'transfer-1',
        fromConnectionId: 'conn-1',
        toInstructorId: 'instructor-2',
        type: 'PERMANENT',
        reason: 'VACATION',
        transferBalance: true,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // через 24 часа
      })

      // Мок исходной связи
      mockClient.studentInstructorConnection.findUnique.mockResolvedValue({
        id: 'conn-1',
        studentId: 'student-1',
        instructorId: 'instructor-1',
        status: 'ACTIVE',
        prepaidLessons: 5,
      })

      // Мок создания новой связи
      mockClient.studentInstructorConnection.create.mockResolvedValue({
        id: 'conn-2',
      })

      const result = await procedures.acceptTransfer(mockClient, {
        transferId: 'transfer-1',
      })

      expect(result.success).toBe(true)
      expect(result.newConnectionId).toBe('conn-2')
    })

    it('должен возвращать ошибку если трансфер не найден', async () => {
      const mockClient = createMockClient()
      mockClient.studentTransfer.findUnique.mockResolvedValue(null)

      const result = await procedures.acceptTransfer(mockClient, {
        transferId: 'non-existent',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('TRANSFER_NOT_FOUND')
    })
  })

  describe('rejectTransfer', () => {
    it('должен отклонять трансфер', async () => {
      const mockClient = createMockClient()

      mockClient.studentTransfer.findUnique.mockResolvedValue({
        id: 'transfer-1',
        status: 'PENDING',
      })

      mockClient.studentTransfer.update.mockResolvedValue({
        id: 'transfer-1',
        status: 'REJECTED',
      })

      const result = await procedures.rejectTransfer(mockClient, {
        transferId: 'transfer-1',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('cancelTransfer', () => {
    it('должен отменять трансфер', async () => {
      const mockClient = createMockClient()

      mockClient.studentTransfer.findUnique.mockResolvedValue({
        id: 'transfer-1',
        status: 'PENDING',
      })

      mockClient.studentTransfer.update.mockResolvedValue({
        id: 'transfer-1',
        status: 'CANCELLED',
      })

      const result = await procedures.cancelTransfer(mockClient, {
        transferId: 'transfer-1',
      })

      expect(result.success).toBe(true)
    })
  })
})

describe('Lesson Procedures', () => {
  describe('confirmLesson', () => {
    it('должен подтверждать занятие', async () => {
      const mockClient = createMockClient()

      mockClient.lesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        status: 'PENDING',
      })

      mockClient.lesson.update.mockResolvedValue({
        id: 'lesson-1',
        status: 'CONFIRMED',
      })

      const result = await procedures.confirmLesson(mockClient, {
        lessonId: 'lesson-1',
      })

      expect(result.success).toBe(true)
      expect(result.lessonId).toBe('lesson-1')
      expect(mockClient.lesson.update).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
        data: { status: 'CONFIRMED' },
      })
    })

    it('должен возвращать ошибку если занятие не найдено', async () => {
      const mockClient = createMockClient()
      mockClient.lesson.findUnique.mockResolvedValue(null)

      const result = await procedures.confirmLesson(mockClient, {
        lessonId: 'non-existent',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('LESSON_NOT_FOUND')
    })
  })

  describe('cancelLesson', () => {
    it('должен отменять занятие с причиной', async () => {
      const mockClient = createMockClient()

      mockClient.lesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        status: 'CONFIRMED',
      })

      mockClient.lesson.update.mockResolvedValue({
        id: 'lesson-1',
        status: 'CANCELLED',
      })

      const result = await procedures.cancelLesson(mockClient, {
        lessonId: 'lesson-1',
        reason: 'Болезнь',
      })

      expect(result.success).toBe(true)
      expect(mockClient.lesson.update).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'Болезнь',
        }),
      })
    })
  })

  describe('completeLesson', () => {
    it('должен завершать занятие с заметками', async () => {
      const mockClient = createMockClient()

      mockClient.lesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        status: 'CONFIRMED',
      })

      mockClient.lesson.update.mockResolvedValue({
        id: 'lesson-1',
        status: 'COMPLETED',
      })

      const result = await procedures.completeLesson(mockClient, {
        lessonId: 'lesson-1',
        notes: 'Отличный урок, ученик хорошо усвоил материал',
      })

      expect(result.success).toBe(true)
      expect(mockClient.lesson.update).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          instructorNotes: 'Отличный урок, ученик хорошо усвоил материал',
        }),
      })
    })
  })

  describe('markNoShow', () => {
    it('должен отмечать неявку', async () => {
      const mockClient = createMockClient()

      mockClient.lesson.findUnique.mockResolvedValue({
        id: 'lesson-1',
        status: 'CONFIRMED',
      })

      mockClient.lesson.update.mockResolvedValue({
        id: 'lesson-1',
        status: 'NO_SHOW',
      })

      const result = await procedures.markNoShow(mockClient, {
        lessonId: 'lesson-1',
      })

      expect(result.success).toBe(true)
      expect(mockClient.lesson.update).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
        data: { status: 'NO_SHOW' },
      })
    })
  })
})

describe('Enrollment Procedures', () => {
  describe('approveEnrollmentRequest', () => {
    it('должен одобрять заявку и создавать связь', async () => {
      const mockClient = createMockClient()

      mockClient.enrollmentRequest.findUnique.mockResolvedValue({
        id: 'request-1',
        instructorId: 'user-instructor',
        status: 'PENDING',
        student: {
          id: 'user-student',
          studentProfile: {
            id: 'student-profile-1',
          },
        },
      })

      mockClient.instructorProfile.findUnique.mockResolvedValue({
        id: 'instructor-profile-1',
        userId: 'user-instructor',
      })

      mockClient.studentInstructorConnection.create.mockResolvedValue({
        id: 'conn-1',
      })

      const result = await procedures.approveEnrollmentRequest(mockClient, {
        requestId: 'request-1',
      })

      expect(result.success).toBe(true)
      expect(result.connectionId).toBe('conn-1')
      expect(result.requestId).toBe('request-1')
    })

    it('должен возвращать ошибку если заявка не найдена', async () => {
      const mockClient = createMockClient()
      mockClient.enrollmentRequest.findUnique.mockResolvedValue(null)

      const result = await procedures.approveEnrollmentRequest(mockClient, {
        requestId: 'non-existent',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('REQUEST_NOT_FOUND')
    })

    it('должен возвращать ошибку если заявка уже обработана', async () => {
      const mockClient = createMockClient()

      mockClient.enrollmentRequest.findUnique.mockResolvedValue({
        id: 'request-1',
        status: 'APPROVED', // уже одобрена
        student: {
          studentProfile: { id: 'sp-1' },
        },
      })

      const result = await procedures.approveEnrollmentRequest(mockClient, {
        requestId: 'request-1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('REQUEST_ALREADY_PROCESSED')
    })
  })

  describe('rejectEnrollmentRequest', () => {
    it('должен отклонять заявку с причиной', async () => {
      const mockClient = createMockClient()

      mockClient.enrollmentRequest.findUnique.mockResolvedValue({
        id: 'request-1',
        status: 'PENDING',
      })

      mockClient.enrollmentRequest.update.mockResolvedValue({
        id: 'request-1',
        status: 'REJECTED',
      })

      const result = await procedures.rejectEnrollmentRequest(mockClient, {
        requestId: 'request-1',
        reason: 'Нет свободных мест',
      })

      expect(result.success).toBe(true)
      expect(result.requestId).toBe('request-1')
      expect(mockClient.enrollmentRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionReason: 'Нет свободных мест',
        }),
      })
    })
  })
})
