/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma client типизируется динамически через ZenStack */
/**
 * Реализации Custom Procedures для ZenStack v3.2.0
 *
 * Процедуры определены в schema.zmodel, реализации подключаются к enhanced client
 */

import type { TransferReason, TransferType } from '@letar/driving-school-db/prisma'

import {
  acceptTransfer,
  cancelTransfer,
  initiateTransfer,
  reclaimStudent,
  rejectTransfer,
  type TransferRepository,
} from './transfers/transfer-service'

// === Типы результатов (соответствуют типам в schema.zmodel) ===

export interface TransferResult {
  success: boolean
  transferId?: string
  error?: string
}

export interface AcceptTransferResult {
  success: boolean
  newConnectionId?: string
  error?: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

export interface LessonResult {
  success: boolean
  lessonId?: string
  error?: string
}

export interface EnrollmentResult {
  success: boolean
  connectionId?: string
  requestId?: string
  error?: string
}

// === Adapter для TransferRepository ===

/**
 * Создаёт TransferRepository из unknown
 */
function createTransferRepo(client: any): TransferRepository {
  return {
    async getConnectionById(id) {
      const conn = await client.studentInstructorConnection.findUnique({
        where: { id },
      })
      if (!conn) {
        return null
      }
      return {
        id: conn.id,
        studentId: conn.studentId,
        instructorId: conn.instructorId,
        status: conn.status,
        isPrimary: conn.isPrimary,
        prepaidLessons: conn.prepaidLessons,
        totalLessons: conn.totalLessons,
        completedLessons: conn.completedLessons,
        cancelledLessons: conn.cancelledLessons,
        noShowCount: conn.noShowCount,
        transferredFrom: conn.transferredFrom,
      }
    },

    async getInstructorProfileById(id) {
      const profile = await client.instructorProfile.findUnique({
        where: { id },
        select: { id: true, userId: true },
      })
      return profile
    },

    async getInstructorProfileByUserId(userId) {
      const profile = await client.instructorProfile.findUnique({
        where: { userId },
        select: { id: true, userId: true },
      })
      return profile
    },

    async getTransferById(id) {
      const transfer = await client.studentTransfer.findUnique({
        where: { id },
      })
      if (!transfer) {
        return null
      }
      return {
        id: transfer.id,
        fromConnectionId: transfer.fromConnectionId,
        toInstructorId: transfer.toInstructorId,
        type: transfer.type,
        reason: transfer.reason,
        transferBalance: transfer.transferBalance,
        status: transfer.status,
        expiresAt: transfer.expiresAt,
        createdAt: transfer.createdAt,
        respondedAt: transfer.respondedAt,
        newConnectionId: transfer.newConnectionId,
      }
    },

    async getActiveTransferByConnection(connectionId) {
      const transfer = await client.studentTransfer.findFirst({
        where: {
          fromConnectionId: connectionId,
          status: 'PENDING',
        },
      })
      if (!transfer) {
        return null
      }
      return {
        id: transfer.id,
        fromConnectionId: transfer.fromConnectionId,
        toInstructorId: transfer.toInstructorId,
        type: transfer.type,
        reason: transfer.reason,
        transferBalance: transfer.transferBalance,
        status: transfer.status,
        expiresAt: transfer.expiresAt,
        createdAt: transfer.createdAt,
        respondedAt: transfer.respondedAt,
        newConnectionId: transfer.newConnectionId,
      }
    },

    async createTransfer(data) {
      const transfer = await client.studentTransfer.create({
        data: {
          fromConnectionId: data.fromConnectionId,
          toInstructorId: data.toInstructorId,
          type: data.type,
          reason: data.reason,
          transferBalance: data.transferBalance,
          status: data.status,
          expiresAt: data.expiresAt,
        },
      })
      return { id: transfer.id }
    },

    async updateTransfer(id, data) {
      await client.studentTransfer.update({
        where: { id },
        data,
      })
    },

    async updateConnectionStatus(id, status) {
      await client.studentInstructorConnection.update({
        where: { id },
        data: { status },
      })
    },

    async updateConnectionBalance(id, balance) {
      await client.studentInstructorConnection.update({
        where: { id },
        data: { prepaidLessons: balance },
      })
    },

    async createConnection(data) {
      const conn = await client.studentInstructorConnection.create({
        data: {
          studentId: data.studentId,
          instructorId: data.instructorId,
          prepaidLessons: data.prepaidLessons,
          transferredFrom: data.transferredFrom,
          status: 'ACTIVE',
          isPrimary: false,
          totalLessons: 0,
          completedLessons: 0,
          cancelledLessons: 0,
          noShowCount: 0,
        },
      })
      return { id: conn.id }
    },

    async getTransfersByFromInstructor(instructorId) {
      const transfers = await client.studentTransfer.findMany({
        where: {
          fromConnection: { instructorId },
        },
        orderBy: { createdAt: 'desc' },
      })
      return transfers.map((t: any) => ({
        id: t.id,
        fromConnectionId: t.fromConnectionId,
        toInstructorId: t.toInstructorId,
        type: t.type,
        reason: t.reason,
        transferBalance: t.transferBalance,
        status: t.status,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
        respondedAt: t.respondedAt,
        newConnectionId: t.newConnectionId,
      }))
    },

    async getPendingTransfersByToInstructor(instructorId) {
      const transfers = await client.studentTransfer.findMany({
        where: {
          toInstructorId: instructorId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      })
      return transfers.map((t: any) => ({
        id: t.id,
        fromConnectionId: t.fromConnectionId,
        toInstructorId: t.toInstructorId,
        type: t.type,
        reason: t.reason,
        transferBalance: t.transferBalance,
        status: t.status,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
        respondedAt: t.respondedAt,
        newConnectionId: t.newConnectionId,
      }))
    },
  }
}

// === Реализации процедур ===

/**
 * Объект с реализациями всех процедур
 * Передаётся в ZenStackClient через опцию procedures
 */
export const procedures = {
  // --- Transfer Procedures ---

  initiateTransfer: async (
    client: any,
    args: {
      connectionId: string
      toInstructorId: string
      type: string
      reason: string
      transferBalance: boolean
    }
  ): Promise<TransferResult> => {
    const repo = createTransferRepo(client)
    const result = await initiateTransfer({
      connectionId: args.connectionId,
      toInstructorId: args.toInstructorId,
      type: args.type as TransferType,
      reason: args.reason as TransferReason,
      transferBalance: args.transferBalance,
      repo,
    })

    if (result.success) {
      return { success: true, transferId: result.transferId }
    }
    return { success: false, error: result.error }
  },

  acceptTransfer: async (client: any, args: { transferId: string }): Promise<AcceptTransferResult> => {
    const repo = createTransferRepo(client)
    const result = await acceptTransfer({
      transferId: args.transferId,
      repo,
    })

    if (result.success) {
      return { success: true, newConnectionId: result.newConnectionId }
    }
    return { success: false, error: result.error }
  },

  rejectTransfer: async (client: any, args: { transferId: string }): Promise<ActionResult> => {
    const repo = createTransferRepo(client)
    const result = await rejectTransfer({
      transferId: args.transferId,
      repo,
    })
    return result
  },

  cancelTransfer: async (client: any, args: { transferId: string }): Promise<ActionResult> => {
    const repo = createTransferRepo(client)
    const result = await cancelTransfer({
      transferId: args.transferId,
      repo,
    })
    return result
  },

  reclaimStudent: async (client: any, args: { transferId: string }): Promise<ActionResult> => {
    const repo = createTransferRepo(client)
    const result = await reclaimStudent({
      transferId: args.transferId,
      repo,
    })
    return result
  },

  // --- Lesson Procedures ---

  confirmLesson: async (client: any, args: { lessonId: string }): Promise<LessonResult> => {
    const lesson = await client.lesson.findUnique({ where: { id: args.lessonId } })
    if (!lesson) {
      return { success: false, error: 'LESSON_NOT_FOUND' }
    }

    await client.lesson.update({
      where: { id: args.lessonId },
      data: { status: 'CONFIRMED' },
    })

    return { success: true, lessonId: args.lessonId }
  },

  cancelLesson: async (client: any, args: { lessonId: string; reason?: string }): Promise<LessonResult> => {
    const lesson = await client.lesson.findUnique({ where: { id: args.lessonId } })
    if (!lesson) {
      return { success: false, error: 'LESSON_NOT_FOUND' }
    }

    await client.lesson.update({
      where: { id: args.lessonId },
      data: {
        status: 'CANCELLED',
        cancellationReason: args.reason,
        cancelledAt: new Date(),
      },
    })

    return { success: true, lessonId: args.lessonId }
  },

  completeLesson: async (client: any, args: { lessonId: string; notes?: string }): Promise<LessonResult> => {
    const lesson = await client.lesson.findUnique({ where: { id: args.lessonId } })
    if (!lesson) {
      return { success: false, error: 'LESSON_NOT_FOUND' }
    }

    await client.lesson.update({
      where: { id: args.lessonId },
      data: {
        status: 'COMPLETED',
        instructorNotes: args.notes,
        completedAt: new Date(),
      },
    })

    return { success: true, lessonId: args.lessonId }
  },

  markNoShow: async (client: any, args: { lessonId: string }): Promise<LessonResult> => {
    const lesson = await client.lesson.findUnique({ where: { id: args.lessonId } })
    if (!lesson) {
      return { success: false, error: 'LESSON_NOT_FOUND' }
    }

    await client.lesson.update({
      where: { id: args.lessonId },
      data: { status: 'NO_SHOW' },
    })

    return { success: true, lessonId: args.lessonId }
  },

  // --- Enrollment Procedures ---

  approveEnrollmentRequest: async (client: any, args: { requestId: string }): Promise<EnrollmentResult> => {
    const request = await client.enrollmentRequest.findUnique({
      where: { id: args.requestId },
      include: {
        student: { include: { studentProfile: true } },
      },
    })

    if (!request) {
      return { success: false, error: 'REQUEST_NOT_FOUND' }
    }

    if (request.status !== 'PENDING') {
      return { success: false, error: 'REQUEST_ALREADY_PROCESSED' }
    }

    // Получаем профиль инструктора
    const instructorProfile = await client.instructorProfile.findUnique({
      where: { userId: request.instructorId },
    })

    if (!instructorProfile) {
      return { success: false, error: 'INSTRUCTOR_PROFILE_NOT_FOUND' }
    }

    // Создаём связь ученик-инструктор
    const studentProfileId = request.student.studentProfile?.id
    if (!studentProfileId) {
      return { success: false, error: 'STUDENT_PROFILE_NOT_FOUND' }
    }

    const connection = await client.studentInstructorConnection.create({
      data: {
        studentId: studentProfileId,
        instructorId: instructorProfile.id,
        status: 'ACTIVE',
        isPrimary: true,
        prepaidLessons: 0,
        totalLessons: 0,
        completedLessons: 0,
        cancelledLessons: 0,
        noShowCount: 0,
      },
    })

    // Обновляем статус заявки
    await client.enrollmentRequest.update({
      where: { id: args.requestId },
      data: {
        status: 'APPROVED',
        respondedAt: new Date(),
      },
    })

    return { success: true, connectionId: connection.id, requestId: args.requestId }
  },

  rejectEnrollmentRequest: async (
    client: any,
    args: { requestId: string; reason?: string }
  ): Promise<EnrollmentResult> => {
    const request = await client.enrollmentRequest.findUnique({
      where: { id: args.requestId },
    })

    if (!request) {
      return { success: false, error: 'REQUEST_NOT_FOUND' }
    }

    if (request.status !== 'PENDING') {
      return { success: false, error: 'REQUEST_ALREADY_PROCESSED' }
    }

    await client.enrollmentRequest.update({
      where: { id: args.requestId },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
        rejectionReason: args.reason,
      },
    })

    return { success: true, requestId: args.requestId }
  },
}
