'use server'

/**
 * Server Actions для передачи учеников между инструкторами
 *
 * Реализует TD-5: Уведомления в передаче учеников
 * - 7.0.7: initiateTransfer — уведомление получателю
 * - 7.0.18: acceptTransfer — уведомление инициатору
 * - 7.0.22: rejectTransfer — уведомление инициатору
 */

import { withInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import type { TransferReason, TransferType } from '@letar/driving-school-db/prisma'

import {
  acceptTransfer,
  cancelTransfer,
  getPendingTransfersForInstructor,
  getTransfersByInstructor,
  initiateTransfer,
  reclaimStudent,
  rejectTransfer,
} from '@/lib/transfers'
import { revalidatePath } from 'next/cache'

import { syncChatsOnStudentReclaimed, syncChatsOnTransferAccepted } from '../_lib/transfer-chat-sync'
import {
  notifyStudentReclaimed,
  notifyTransferAccepted,
  notifyTransferInitiated,
  notifyTransferRejected,
} from '../_lib/transfer-notifications'
import { createTransferRepository, getTransferWithRelations } from '../_lib/transfer-repository'

// === Типы результатов ===

export type TransferActionResult = { success: true } | { success: false; error: string }

export type InitiateTransferActionResult = { success: true; transferId: string } | { success: false; error: string }

export type AcceptTransferActionResult = { success: true; newConnectionId: string } | { success: false; error: string }

export interface TransferWithDetails {
  id: string
  type: TransferType
  reason: TransferReason
  status: string
  expiresAt: Date
  createdAt: Date
  respondedAt: Date | null
  transferBalance: boolean
  // Данные ученика
  student: {
    id: string
    name: string
    email: string
    image: string | null
  }
  // Данные инициатора (для входящих)
  fromInstructor?: {
    id: string
    name: string
    image: string | null
  }
  // Данные получателя (для исходящих)
  toInstructor?: {
    id: string
    name: string
    image: string | null
  }
}

// === Маппинг ошибок ===

const INITIATE_ERROR_MESSAGES: Record<string, string> = {
  CONNECTION_NOT_FOUND: 'Связь с учеником не найдена',
  CONNECTION_NOT_ACTIVE: 'Связь не активна',
  RECIPIENT_NOT_FOUND: 'Инструктор-получатель не найден',
  SAME_INSTRUCTOR: 'Нельзя передать ученика самому себе',
  TRANSFER_ALREADY_EXISTS: 'Уже есть активный запрос на передачу',
}

const ACCEPT_ERROR_MESSAGES: Record<string, string> = {
  TRANSFER_NOT_FOUND: 'Передача не найдена',
  TRANSFER_EXPIRED: 'Срок действия передачи истёк',
  TRANSFER_ALREADY_PROCESSED: 'Передача уже обработана',
  CONNECTION_NOT_FOUND: 'Связь не найдена',
}

const REJECT_ERROR_MESSAGES: Record<string, string> = {
  TRANSFER_NOT_FOUND: 'Передача не найдена',
  TRANSFER_ALREADY_PROCESSED: 'Передача уже обработана',
}

const CANCEL_ERROR_MESSAGES: Record<string, string> = {
  TRANSFER_NOT_FOUND: 'Передача не найдена',
  TRANSFER_ALREADY_PROCESSED: 'Передача уже обработана',
}

const RECLAIM_ERROR_MESSAGES: Record<string, string> = {
  TRANSFER_NOT_FOUND: 'Передача не найдена',
  CONNECTION_NOT_PAUSED: 'Связь не на паузе',
  PERMANENT_TRANSFER: 'Нельзя вернуть ученика после постоянной передачи',
  NEW_CONNECTION_NOT_FOUND: 'Новая связь не найдена',
}

// === Server Actions ===

/**
 * Инициирование передачи ученика (7.0.7)
 *
 * Отправляет уведомление получателю о предложении передачи
 */
export async function initiateTransferAction(params: {
  connectionId: string
  toInstructorId: string
  type: TransferType
  reason: TransferReason
  transferBalance: boolean
}): Promise<InitiateTransferActionResult> {
  return withInstructor(async (user) => {
    const db = getEnhancedPrisma(user)

    try {
      const repo = createTransferRepository(db)

      // Проверяем, что связь принадлежит текущему инструктору
      const connection = await db.studentInstructorConnection.findUnique({
        where: { id: params.connectionId },
        include: {
          instructor: { include: { user: { select: { id: true, name: true } } } },
          student: { include: { user: { select: { id: true, name: true } } } },
        },
      })

      if (!connection || connection.instructor.userId !== user.id) {
        return { success: false, error: 'Связь не найдена или не принадлежит вам' }
      }

      // Получаем информацию о получателе
      const toInstructor = await db.instructorProfile.findUnique({
        where: { id: params.toInstructorId },
        include: { user: { select: { id: true, name: true } } },
      })

      if (!toInstructor) {
        return { success: false, error: 'Инструктор-получатель не найден' }
      }

      // Выполняем передачу
      const result = await initiateTransfer({
        connectionId: params.connectionId,
        toInstructorId: params.toInstructorId,
        type: params.type,
        reason: params.reason,
        transferBalance: params.transferBalance,
        repo,
      })

      if (!result.success) {
        return { success: false, error: INITIATE_ERROR_MESSAGES[result.error] || 'Ошибка передачи' }
      }

      // === 7.0.7: Уведомление получателю ===
      await notifyTransferInitiated({
        db,
        recipientUserId: toInstructor.userId,
        participants: {
          initiatorName: connection.instructor.user.name || 'Без имени',
          recipientName: toInstructor.user.name || 'Без имени',
          studentName: connection.student.user.name || 'Без имени',
        },
        ids: {
          transferId: result.transferId,
          studentId: connection.studentId,
          instructorId: connection.instructorId,
        },
        type: params.type,
      })

      revalidatePath('/students')
      return { success: true, transferId: result.transferId }
    } catch (error) {
      console.error('Ошибка инициирования передачи:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

/**
 * Принятие передачи ученика (7.0.18)
 *
 * Отправляет уведомление инициатору о принятии передачи
 */
export async function acceptTransferAction(transferId: string): Promise<AcceptTransferActionResult> {
  return withInstructor(async (user) => {
    const db = getEnhancedPrisma(user)

    try {
      // Получаем информацию о передаче до её принятия
      const transferData = await getTransferWithRelations(db, transferId)

      if (!transferData || !transferData.fromConnection || !transferData.toInstructor) {
        return { success: false, error: 'Передача не найдена' }
      }

      const { transfer, fromConnection, toInstructor } = transferData

      // Проверяем, что текущий пользователь — получатель
      if (toInstructor.userId !== user.id) {
        return { success: false, error: 'Вы не являетесь получателем этой передачи' }
      }

      const repo = createTransferRepository(db)

      // Выполняем принятие
      const result = await acceptTransfer({
        transferId,
        repo,
      })

      if (!result.success) {
        return { success: false, error: ACCEPT_ERROR_MESSAGES[result.error] || 'Ошибка принятия' }
      }

      // === Обновление чатов инструкторов ===
      await syncChatsOnTransferAccepted({
        studentUserId: fromConnection.student.user.id,
        fromInstructorUserId: fromConnection.instructor.userId,
        toInstructorUserId: toInstructor.userId,
      })

      // === 7.0.18: Уведомление инициатору о принятии ===
      await notifyTransferAccepted({
        db,
        initiatorUserId: fromConnection.instructor.userId,
        participants: {
          initiatorName: fromConnection.instructor.user.name || 'Без имени',
          recipientName: toInstructor.user.name || 'Без имени',
          studentName: fromConnection.student.user.name || 'Без имени',
        },
        ids: {
          transferId,
          studentId: fromConnection.studentId,
          instructorId: transfer.toInstructorId,
        },
      })

      revalidatePath('/students')
      return { success: true, newConnectionId: result.newConnectionId }
    } catch (error) {
      console.error('Ошибка принятия передачи:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

/**
 * Отклонение передачи ученика (7.0.22)
 *
 * Отправляет уведомление инициатору об отклонении передачи
 */
export async function rejectTransferAction(transferId: string): Promise<TransferActionResult> {
  return withInstructor(async (user) => {
    const db = getEnhancedPrisma(user)

    try {
      // Получаем информацию о передаче до её отклонения
      const transferData = await getTransferWithRelations(db, transferId)

      if (!transferData || !transferData.fromConnection || !transferData.toInstructor) {
        return { success: false, error: 'Передача не найдена' }
      }

      const { transfer, fromConnection, toInstructor } = transferData

      // Проверяем, что текущий пользователь — получатель
      if (toInstructor.userId !== user.id) {
        return { success: false, error: 'Вы не являетесь получателем этой передачи' }
      }

      const repo = createTransferRepository(db)

      // Выполняем отклонение
      const result = await rejectTransfer({
        transferId,
        repo,
      })

      if (!result.success) {
        return { success: false, error: REJECT_ERROR_MESSAGES[result.error] || 'Ошибка отклонения' }
      }

      // === 7.0.22: Уведомление инициатору об отклонении ===
      await notifyTransferRejected({
        db,
        initiatorUserId: fromConnection.instructor.userId,
        participants: {
          initiatorName: fromConnection.instructor.user.name || 'Без имени',
          recipientName: toInstructor.user.name || 'Без имени',
          studentName: fromConnection.student.user.name || 'Без имени',
        },
        ids: {
          transferId,
          studentId: fromConnection.studentId,
          instructorId: transfer.toInstructorId,
        },
      })

      revalidatePath('/students')
      return { success: true }
    } catch (error) {
      console.error('Ошибка отклонения передачи:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

/**
 * Отмена запроса на передачу (только инициатор)
 */
export async function cancelTransferAction(transferId: string): Promise<TransferActionResult> {
  return withInstructor(async (user) => {
    const db = getEnhancedPrisma(user)

    try {
      // Получаем данные передачи
      const transferData = await getTransferWithRelations(db, transferId)

      if (!transferData || !transferData.fromConnection) {
        return { success: false, error: 'Передача не найдена' }
      }

      // Проверяем, что текущий пользователь — инициатор
      if (transferData.fromConnection.instructor.userId !== user.id) {
        return { success: false, error: 'Передача не найдена или не принадлежит вам' }
      }

      const repo = createTransferRepository(db)

      const result = await cancelTransfer({
        transferId,
        repo,
      })

      if (!result.success) {
        return { success: false, error: CANCEL_ERROR_MESSAGES[result.error] || 'Ошибка отмены' }
      }

      revalidatePath('/students')
      return { success: true }
    } catch (error) {
      console.error('Ошибка отмены передачи:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

/**
 * Возврат ученика (только для временных передач)
 */
export async function reclaimStudentAction(transferId: string): Promise<TransferActionResult> {
  return withInstructor(async (user) => {
    const db = getEnhancedPrisma(user)

    try {
      // Получаем данные передачи
      const transferData = await getTransferWithRelations(db, transferId)

      if (!transferData || !transferData.fromConnection || !transferData.toInstructor) {
        return { success: false, error: 'Передача не найдена' }
      }

      const { fromConnection, toInstructor } = transferData

      // Проверяем, что текущий пользователь — инициатор
      if (fromConnection.instructor.userId !== user.id) {
        return { success: false, error: 'Передача не найдена или не принадлежит вам' }
      }

      const repo = createTransferRepository(db)

      const result = await reclaimStudent({
        transferId,
        repo,
      })

      if (!result.success) {
        return { success: false, error: RECLAIM_ERROR_MESSAGES[result.error] || 'Ошибка возврата' }
      }

      // === Обновление чатов инструкторов ===
      await syncChatsOnStudentReclaimed({
        studentUserId: fromConnection.student.user.id,
        originalInstructorUserId: fromConnection.instructor.userId,
        temporaryInstructorUserId: toInstructor.userId,
      })

      // Уведомляем получателя о возврате ученика
      await notifyStudentReclaimed({
        db,
        recipientUserId: toInstructor.userId,
        participants: {
          initiatorName: fromConnection.instructor.user.name || 'Без имени',
          recipientName: toInstructor.user.name || 'Без имени',
          studentName: fromConnection.student.user.name || 'Без имени',
        },
        ids: {
          transferId,
          studentId: fromConnection.studentId,
          instructorId: fromConnection.instructorId,
        },
      })

      revalidatePath('/students')
      return { success: true }
    } catch (error) {
      console.error('Ошибка возврата ученика:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

/**
 * Получение исходящих запросов на передачу (от текущего инструктора)
 */
export async function getOutgoingTransfersAction(): Promise<{
  success: boolean
  transfers?: TransferWithDetails[]
  error?: string
}> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const repo = createTransferRepository(db)
      const result = await getTransfersByInstructor({
        instructorId: instructorProfileId,
        repo,
      })

      // Обогащаем данные
      const enrichedTransfers = await Promise.all(
        result.transfers.map(async (transfer) => {
          const transferData = await getTransferWithRelations(db, transfer.id)

          if (!transferData || !transferData.fromConnection || !transferData.toInstructor) {
            return null
          }

          return {
            id: transfer.id,
            type: transfer.type,
            reason: transfer.reason,
            status: transfer.status,
            expiresAt: transfer.expiresAt,
            createdAt: transfer.createdAt,
            respondedAt: transfer.respondedAt,
            transferBalance: transfer.transferBalance,
            student: {
              id: transferData.fromConnection.student.id,
              name: transferData.fromConnection.student.user.name || 'Без имени',
              email: transferData.fromConnection.student.user.email || '',
              image: transferData.fromConnection.student.user.image,
            },
            toInstructor: {
              id: transferData.toInstructor.id,
              name: transferData.toInstructor.user.name || 'Без имени',
              image: transferData.toInstructor.user.image,
            },
          }
        })
      )

      return {
        success: true,
        transfers: enrichedTransfers.filter(Boolean) as TransferWithDetails[],
      }
    } catch (error) {
      console.error('Ошибка получения исходящих передач:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

/**
 * Получение входящих запросов на передачу (к текущему инструктору)
 */
export async function getIncomingTransfersAction(): Promise<{
  success: boolean
  transfers?: TransferWithDetails[]
  error?: string
}> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const repo = createTransferRepository(db)
      const result = await getPendingTransfersForInstructor({
        instructorId: instructorProfileId,
        repo,
      })

      // Обогащаем данные
      const enrichedTransfers = await Promise.all(
        result.transfers.map(async (transfer) => {
          const transferData = await getTransferWithRelations(db, transfer.id)

          if (!transferData || !transferData.fromConnection) {
            return null
          }

          return {
            id: transfer.id,
            type: transfer.type,
            reason: transfer.reason,
            status: transfer.status,
            expiresAt: transfer.expiresAt,
            createdAt: transfer.createdAt,
            respondedAt: transfer.respondedAt,
            transferBalance: transfer.transferBalance,
            student: {
              id: transferData.fromConnection.student.id,
              name: transferData.fromConnection.student.user.name || 'Без имени',
              email: transferData.fromConnection.student.user.email || '',
              image: transferData.fromConnection.student.user.image,
            },
            fromInstructor: {
              id: transferData.fromConnection.instructor.id,
              name: transferData.fromConnection.instructor.user.name || 'Без имени',
              image: transferData.fromConnection.instructor.user.image,
            },
          }
        })
      )

      return {
        success: true,
        transfers: enrichedTransfers.filter(Boolean) as TransferWithDetails[],
      }
    } catch (error) {
      console.error('Ошибка получения входящих передач:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}
