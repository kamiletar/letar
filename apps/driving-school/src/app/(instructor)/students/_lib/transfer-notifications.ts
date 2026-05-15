/**
 * Уведомления для передачи учеников
 *
 * Выделены из transfer.action.ts для переиспользуемости
 * Реализует TD-5: Уведомления в передаче учеников
 */

import { getAppUrl } from '@/lib/app-url'
import type { DbClient } from '@/lib/db-types'
import { notifyUser, type OrchestratorProviders, type OrchestratorRepository } from '@/lib/notifications'
import { createNotificationProviders, createOrchestratorRepository } from '@/lib/orchestrator-repository'

/**
 * Хелпер для отправки уведомлений
 */
async function sendNotification(params: {
  db: DbClient
  userId: string
  type: 'STUDENT_TRANSFER' | 'INSTRUCTOR_RETURNED'
  title: string
  body: string
  data: Record<string, unknown>
  repo?: OrchestratorRepository
  providers?: OrchestratorProviders
}) {
  const repo = params.repo ?? createOrchestratorRepository(params.db)
  const providers = params.providers ?? createNotificationProviders()

  await notifyUser({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    data: params.data,
    repo,
    providers,
    appUrl: getAppUrl(),
  })
}

// === Типы для уведомлений ===

interface TransferParticipants {
  initiatorName: string
  recipientName: string
  studentName: string
}

interface TransferIds {
  transferId: string
  studentId: string
  instructorId: string
}

// === Уведомления ===

/**
 * 7.0.7: Уведомление получателю о предложении передачи
 */
export async function notifyTransferInitiated(params: {
  db: DbClient
  recipientUserId: string
  participants: TransferParticipants
  ids: TransferIds
  type: string
}): Promise<void> {
  await sendNotification({
    db: params.db,
    userId: params.recipientUserId,
    type: 'STUDENT_TRANSFER',
    title: 'Вам предложена передача ученика',
    body: `Инструктор ${params.participants.initiatorName} предлагает передать вам ученика ${params.participants.studentName}`,
    data: {
      transferId: params.ids.transferId,
      studentId: params.ids.studentId,
      fromInstructorId: params.ids.instructorId,
      type: params.type,
      actionUrl: `/students/transfers`,
    },
  })
}

/**
 * 7.0.18: Уведомление инициатору о принятии передачи
 */
export async function notifyTransferAccepted(params: {
  db: DbClient
  initiatorUserId: string
  participants: TransferParticipants
  ids: TransferIds
}): Promise<void> {
  await sendNotification({
    db: params.db,
    userId: params.initiatorUserId,
    type: 'STUDENT_TRANSFER',
    title: 'Передача ученика принята',
    body: `Инструктор ${params.participants.recipientName} принял передачу ученика ${params.participants.studentName}`,
    data: {
      transferId: params.ids.transferId,
      studentId: params.ids.studentId,
      toInstructorId: params.ids.instructorId,
      status: 'ACCEPTED',
      actionUrl: `/students`,
    },
  })
}

/**
 * 7.0.22: Уведомление инициатору об отклонении передачи
 */
export async function notifyTransferRejected(params: {
  db: DbClient
  initiatorUserId: string
  participants: TransferParticipants
  ids: TransferIds
}): Promise<void> {
  await sendNotification({
    db: params.db,
    userId: params.initiatorUserId,
    type: 'STUDENT_TRANSFER',
    title: 'Передача ученика отклонена',
    body: `Инструктор ${params.participants.recipientName} отклонил передачу ученика ${params.participants.studentName}`,
    data: {
      transferId: params.ids.transferId,
      studentId: params.ids.studentId,
      toInstructorId: params.ids.instructorId,
      status: 'REJECTED',
      actionUrl: `/students`,
    },
  })
}

/**
 * Уведомление получателю о возврате ученика
 */
export async function notifyStudentReclaimed(params: {
  db: DbClient
  recipientUserId: string
  participants: TransferParticipants
  ids: TransferIds
}): Promise<void> {
  await sendNotification({
    db: params.db,
    userId: params.recipientUserId,
    type: 'INSTRUCTOR_RETURNED',
    title: 'Ученик возвращён',
    body: `Инструктор ${params.participants.initiatorName} вернул себе ученика ${params.participants.studentName}`,
    data: {
      transferId: params.ids.transferId,
      studentId: params.ids.studentId,
      actionUrl: `/students`,
    },
  })
}
