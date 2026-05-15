/**
 * Сервис уведомлений для операций передачи учеников
 *
 * Создаёт уведомления при:
 * - Инициации передачи (получателю)
 * - Принятии передачи (инициатору)
 * - Отклонении передачи (инициатору)
 */

import type { NotificationType } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface TransferNotificationData {
  transferId: string
  studentName: string
  fromInstructorName: string
  toInstructorName: string
  type: 'TEMPORARY' | 'PERMANENT'
  reason: 'VACATION' | 'ILLNESS' | 'OVERLOAD' | 'OTHER'
  transferBalance: boolean
  prepaidLessons: number
}

export interface NotificationPayload {
  userId: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown>
}

// === Тексты уведомлений ===

const TRANSFER_TYPE_TEXT = {
  TEMPORARY: 'временную',
  PERMANENT: 'постоянную',
} as const

const TRANSFER_REASON_TEXT = {
  VACATION: 'отпуск',
  ILLNESS: 'болезнь',
  OVERLOAD: 'высокая нагрузка',
  OTHER: 'другая причина',
} as const

// === Функции создания уведомлений ===

/**
 * Создаёт уведомление для получателя при инициации передачи
 */
export function createTransferRequestNotification(
  recipientUserId: string,
  data: TransferNotificationData
): NotificationPayload {
  const typeText = TRANSFER_TYPE_TEXT[data.type]
  const reasonText = TRANSFER_REASON_TEXT[data.reason]

  const balanceText =
    data.transferBalance && data.prepaidLessons > 0 ? ` Баланс ${data.prepaidLessons} занятий будет перенесён.` : ''

  return {
    userId: recipientUserId,
    type: 'STUDENT_TRANSFER',
    title: 'Запрос на передачу ученика',
    body: `${data.fromInstructorName} предлагает ${typeText} передачу ученика ${data.studentName}. Причина: ${reasonText}.${balanceText}`,
    data: {
      transferId: data.transferId,
      studentName: data.studentName,
      fromInstructorName: data.fromInstructorName,
      type: data.type,
      reason: data.reason,
    },
  }
}

/**
 * Создаёт уведомление для инициатора при принятии передачи
 */
export function createTransferAcceptedNotification(
  initiatorUserId: string,
  data: TransferNotificationData
): NotificationPayload {
  return {
    userId: initiatorUserId,
    type: 'STUDENT_TRANSFER',
    title: 'Передача принята',
    body: `${data.toInstructorName} принял(а) передачу ученика ${data.studentName}. Ученик теперь занимается с новым инструктором.`,
    data: {
      transferId: data.transferId,
      studentName: data.studentName,
      toInstructorName: data.toInstructorName,
      accepted: true,
    },
  }
}

/**
 * Создаёт уведомление для инициатора при отклонении передачи
 */
export function createTransferRejectedNotification(
  initiatorUserId: string,
  data: TransferNotificationData
): NotificationPayload {
  return {
    userId: initiatorUserId,
    type: 'STUDENT_TRANSFER',
    title: 'Передача отклонена',
    body: `${data.toInstructorName} отклонил(а) передачу ученика ${data.studentName}. Ученик остаётся с вами.`,
    data: {
      transferId: data.transferId,
      studentName: data.studentName,
      toInstructorName: data.toInstructorName,
      rejected: true,
    },
  }
}

/**
 * Создаёт уведомление для ученика при передаче
 */
export function createTransferNotificationForStudent(
  studentUserId: string,
  data: TransferNotificationData,
  accepted: boolean
): NotificationPayload {
  if (accepted) {
    return {
      userId: studentUserId,
      type: 'STUDENT_TRANSFER',
      title: 'Смена инструктора',
      body: `Вы были переданы от ${data.fromInstructorName} к ${data.toInstructorName}. Теперь вы можете записываться на занятия к новому инструктору.`,
      data: {
        transferId: data.transferId,
        fromInstructorName: data.fromInstructorName,
        toInstructorName: data.toInstructorName,
        accepted: true,
      },
    }
  }

  return {
    userId: studentUserId,
    type: 'STUDENT_TRANSFER',
    title: 'Передача отменена',
    body: `Передача от ${data.fromInstructorName} к ${data.toInstructorName} была отклонена. Вы продолжаете заниматься с ${data.fromInstructorName}.`,
    data: {
      transferId: data.transferId,
      fromInstructorName: data.fromInstructorName,
      rejected: true,
    },
  }
}
