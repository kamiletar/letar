/**
 * Репозитории для работы с передачей учеников
 *
 * Выделены из transfer.action.ts для переиспользуемости
 * и уменьшения размера action-файла
 */

import type { DbClient } from '@/lib/db-types'
import type { TransferRepository } from '@/lib/transfers'

/**
 * Создаёт репозиторий для transfer-service на базе Prisma
 */
export function createTransferRepository(db: DbClient): TransferRepository {
  return {
    getConnectionById: async (id) => {
      const conn = await db.studentInstructorConnection.findUnique({
        where: { id },
      })
      return conn
    },
    getInstructorProfileById: async (id) => {
      const profile = await db.instructorProfile.findUnique({
        where: { id },
        select: { id: true, userId: true },
      })
      return profile
    },
    getInstructorProfileByUserId: async (userId) => {
      const profile = await db.instructorProfile.findFirst({
        where: { userId },
        select: { id: true, userId: true },
      })
      return profile
    },
    getTransferById: async (id) => {
      const transfer = await db.studentTransfer.findUnique({
        where: { id },
      })
      return transfer
    },
    getActiveTransferByConnection: async (connectionId) => {
      const transfer = await db.studentTransfer.findFirst({
        where: {
          fromConnectionId: connectionId,
          status: 'PENDING',
        },
      })
      return transfer
    },
    createTransfer: async (data) => {
      const transfer = await db.studentTransfer.create({
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
    updateTransfer: async (id, data) => {
      await db.studentTransfer.update({
        where: { id },
        data,
      })
    },
    updateConnectionStatus: async (id, status) => {
      await db.studentInstructorConnection.update({
        where: { id },
        data: { status },
      })
    },
    updateConnectionBalance: async (id, balance) => {
      await db.studentInstructorConnection.update({
        where: { id },
        data: { prepaidLessons: balance },
      })
    },
    createConnection: async (data) => {
      const conn = await db.studentInstructorConnection.create({
        data: {
          studentId: data.studentId,
          instructorId: data.instructorId,
          prepaidLessons: data.prepaidLessons,
          transferredFrom: data.transferredFrom,
          status: 'ACTIVE',
          isPrimary: false,
        },
      })
      return { id: conn.id }
    },
    getTransfersByFromInstructor: async (instructorId) => {
      // Получаем все связи инструктора
      const connections = await db.studentInstructorConnection.findMany({
        where: { instructorId },
        select: { id: true },
      })
      const connectionIds = connections.map((c) => c.id)

      const transfers = await db.studentTransfer.findMany({
        where: {
          fromConnectionId: { in: connectionIds },
        },
        orderBy: { createdAt: 'desc' },
      })
      return transfers
    },
    getPendingTransfersByToInstructor: async (instructorId) => {
      const transfers = await db.studentTransfer.findMany({
        where: {
          toInstructorId: instructorId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      })
      return transfers
    },
  }
}

/**
 * Хелпер для получения данных передачи с связанными сущностями
 * (StudentTransfer не имеет relations в схеме, поэтому делаем отдельные запросы)
 */
export async function getTransferWithRelations(db: DbClient, transferId: string) {
  const transfer = await db.studentTransfer.findUnique({
    where: { id: transferId },
  })

  if (!transfer) {
    return null
  }

  // Получаем связь (fromConnection)
  const fromConnection = await db.studentInstructorConnection.findUnique({
    where: { id: transfer.fromConnectionId },
    include: {
      instructor: { include: { user: { select: { id: true, name: true, image: true } } } },
      student: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
    },
  })

  // Получаем получателя (toInstructor)
  const toInstructor = await db.instructorProfile.findUnique({
    where: { id: transfer.toInstructorId },
    include: { user: { select: { id: true, name: true, image: true } } },
  })

  return {
    transfer,
    fromConnection,
    toInstructor,
  }
}
