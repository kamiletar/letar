/**
 * Сервис передачи учеников
 *
 * Бизнес-логика:
 * - Инструктор А может инициировать передачу ученика инструктору Б
 * - Инструктор Б должен принять или отклонить передачу
 * - Передача может быть временной (можно вернуть) или постоянной
 * - При принятии создаётся новая связь, исходная получает статус PAUSED или DISCONNECTED
 * - Баланс предоплаченных занятий может переноситься (настраиваемо)
 */

import type { ConnectionStatus, TransferReason, TransferStatus, TransferType } from '@letar/driving-school-db/prisma'

// === Типы данных ===

export interface TransferData {
  id: string
  fromConnectionId: string
  toInstructorId: string
  type: TransferType
  reason: TransferReason
  transferBalance: boolean
  status: TransferStatus
  expiresAt: Date
  createdAt: Date
  respondedAt: Date | null
  newConnectionId: string | null
}

export interface ConnectionData {
  id: string
  studentId: string
  instructorId: string
  status: ConnectionStatus
  isPrimary: boolean
  prepaidLessons: number
  totalLessons: number
  completedLessons: number
  cancelledLessons: number
  noShowCount: number
  transferredFrom: string | null
}

export interface InstructorProfileData {
  id: string
  userId: string
}

// === Репозиторий (абстракция для тестирования) ===

export interface TransferRepository {
  getConnectionById(id: string): Promise<ConnectionData | null>
  getInstructorProfileById(id: string): Promise<InstructorProfileData | null>
  getInstructorProfileByUserId(userId: string): Promise<InstructorProfileData | null>
  getTransferById(id: string): Promise<TransferData | null>
  getActiveTransferByConnection(connectionId: string): Promise<TransferData | null>
  createTransfer(
    data: Omit<TransferData, 'id' | 'createdAt' | 'respondedAt' | 'newConnectionId'>
  ): Promise<{ id: string }>
  updateTransfer(id: string, data: Partial<TransferData>): Promise<void>
  updateConnectionStatus(id: string, status: ConnectionStatus): Promise<void>
  updateConnectionBalance(id: string, balance: number): Promise<void>
  createConnection(data: {
    studentId: string
    instructorId: string
    prepaidLessons: number
    transferredFrom: string
  }): Promise<{ id: string }>
  getTransfersByFromInstructor(instructorId: string): Promise<TransferData[]>
  getPendingTransfersByToInstructor(instructorId: string): Promise<TransferData[]>
}

// === Типы результатов ===

export type InitiateTransferError =
  | 'CONNECTION_NOT_FOUND'
  | 'CONNECTION_NOT_ACTIVE'
  | 'RECIPIENT_NOT_FOUND'
  | 'SAME_INSTRUCTOR'
  | 'TRANSFER_ALREADY_EXISTS'

export type InitiateTransferResult =
  | { success: true; transferId: string }
  | { success: false; error: InitiateTransferError }

export type AcceptTransferError =
  | 'TRANSFER_NOT_FOUND'
  | 'TRANSFER_EXPIRED'
  | 'TRANSFER_ALREADY_PROCESSED'
  | 'CONNECTION_NOT_FOUND'

export type AcceptTransferResult =
  | { success: true; newConnectionId: string }
  | { success: false; error: AcceptTransferError }

export type RejectTransferError = 'TRANSFER_NOT_FOUND' | 'TRANSFER_ALREADY_PROCESSED'

export type RejectTransferResult = { success: true } | { success: false; error: RejectTransferError }

export type ReclaimStudentError =
  | 'TRANSFER_NOT_FOUND'
  | 'CONNECTION_NOT_PAUSED'
  | 'PERMANENT_TRANSFER'
  | 'NEW_CONNECTION_NOT_FOUND'

export type ReclaimStudentResult = { success: true } | { success: false; error: ReclaimStudentError }

export type CancelTransferError = 'TRANSFER_NOT_FOUND' | 'TRANSFER_ALREADY_PROCESSED'

export type CancelTransferResult = { success: true } | { success: false; error: CancelTransferError }

// === Функции ===

export async function initiateTransfer(params: {
  connectionId: string
  toInstructorId: string
  type: TransferType
  reason: TransferReason
  transferBalance: boolean
  repo: TransferRepository
}): Promise<InitiateTransferResult> {
  const { connectionId, toInstructorId, type, reason, transferBalance, repo } = params

  // Проверяем существование связи
  const connection = await repo.getConnectionById(connectionId)
  if (!connection) {
    return { success: false, error: 'CONNECTION_NOT_FOUND' }
  }

  // Проверяем активность связи
  if (connection.status !== 'ACTIVE') {
    return { success: false, error: 'CONNECTION_NOT_ACTIVE' }
  }

  // Проверяем существование получателя
  const recipient = await repo.getInstructorProfileById(toInstructorId)
  if (!recipient) {
    return { success: false, error: 'RECIPIENT_NOT_FOUND' }
  }

  // Проверяем что получатель — не тот же инструктор
  if (toInstructorId === connection.instructorId) {
    return { success: false, error: 'SAME_INSTRUCTOR' }
  }

  // Проверяем что нет активного запроса
  const existingTransfer = await repo.getActiveTransferByConnection(connectionId)
  if (existingTransfer) {
    return { success: false, error: 'TRANSFER_ALREADY_EXISTS' }
  }

  // Создаём запрос на передачу
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 дней
  const result = await repo.createTransfer({
    fromConnectionId: connectionId,
    toInstructorId,
    type,
    reason,
    transferBalance,
    status: 'PENDING',
    expiresAt,
  })

  return { success: true, transferId: result.id }
}

export async function acceptTransfer(params: {
  transferId: string
  repo: TransferRepository
}): Promise<AcceptTransferResult> {
  const { transferId, repo } = params

  // Получаем запрос на передачу
  const transfer = await repo.getTransferById(transferId)
  if (!transfer) {
    return { success: false, error: 'TRANSFER_NOT_FOUND' }
  }

  // Проверяем срок действия
  if (new Date() > transfer.expiresAt) {
    return { success: false, error: 'TRANSFER_EXPIRED' }
  }

  // Проверяем статус
  if (transfer.status !== 'PENDING') {
    return { success: false, error: 'TRANSFER_ALREADY_PROCESSED' }
  }

  // Получаем исходную связь
  const connection = await repo.getConnectionById(transfer.fromConnectionId)
  if (!connection) {
    return { success: false, error: 'CONNECTION_NOT_FOUND' }
  }

  // Создаём новую связь
  const prepaidLessons = transfer.transferBalance ? connection.prepaidLessons : 0
  const newConnection = await repo.createConnection({
    studentId: connection.studentId,
    instructorId: transfer.toInstructorId,
    prepaidLessons,
    transferredFrom: connection.id,
  })

  // Обновляем статус исходной связи
  const newConnectionStatus: ConnectionStatus = transfer.type === 'TEMPORARY' ? 'PAUSED' : 'DISCONNECTED'
  await repo.updateConnectionStatus(connection.id, newConnectionStatus)

  // Переносим баланс если нужно
  if (transfer.transferBalance && connection.prepaidLessons > 0) {
    await repo.updateConnectionBalance(connection.id, 0)
  }

  // Обновляем статус запроса
  await repo.updateTransfer(transferId, {
    status: 'ACCEPTED',
    respondedAt: new Date(),
    newConnectionId: newConnection.id,
  })

  return { success: true, newConnectionId: newConnection.id }
}

export async function rejectTransfer(params: {
  transferId: string
  repo: TransferRepository
}): Promise<RejectTransferResult> {
  const { transferId, repo } = params

  // Получаем запрос на передачу
  const transfer = await repo.getTransferById(transferId)
  if (!transfer) {
    return { success: false, error: 'TRANSFER_NOT_FOUND' }
  }

  // Проверяем статус
  if (transfer.status !== 'PENDING') {
    return { success: false, error: 'TRANSFER_ALREADY_PROCESSED' }
  }

  // Обновляем статус запроса
  await repo.updateTransfer(transferId, {
    status: 'REJECTED',
    respondedAt: new Date(),
  })

  return { success: true }
}

export async function reclaimStudent(params: {
  transferId: string
  repo: TransferRepository
}): Promise<ReclaimStudentResult> {
  const { transferId, repo } = params

  // Получаем запрос на передачу
  const transfer = await repo.getTransferById(transferId)
  if (!transfer) {
    return { success: false, error: 'TRANSFER_NOT_FOUND' }
  }

  // Проверяем что передача была временной
  if (transfer.type === 'PERMANENT') {
    return { success: false, error: 'PERMANENT_TRANSFER' }
  }

  // Получаем исходную связь
  const originalConnection = await repo.getConnectionById(transfer.fromConnectionId)
  if (!originalConnection) {
    return { success: false, error: 'TRANSFER_NOT_FOUND' }
  }

  // Проверяем что исходная связь на паузе
  if (originalConnection.status !== 'PAUSED') {
    return { success: false, error: 'CONNECTION_NOT_PAUSED' }
  }

  // Получаем новую связь
  if (!transfer.newConnectionId) {
    return { success: false, error: 'NEW_CONNECTION_NOT_FOUND' }
  }
  const newConnection = await repo.getConnectionById(transfer.newConnectionId)
  if (!newConnection) {
    return { success: false, error: 'NEW_CONNECTION_NOT_FOUND' }
  }

  // Переносим баланс обратно если нужно
  if (transfer.transferBalance && newConnection.prepaidLessons > 0) {
    await repo.updateConnectionBalance(originalConnection.id, newConnection.prepaidLessons)
    await repo.updateConnectionBalance(newConnection.id, 0)
  }

  // Активируем исходную связь
  await repo.updateConnectionStatus(originalConnection.id, 'ACTIVE')

  // Отключаем новую связь
  await repo.updateConnectionStatus(newConnection.id, 'DISCONNECTED')

  return { success: true }
}

export async function cancelTransfer(params: {
  transferId: string
  repo: TransferRepository
}): Promise<CancelTransferResult> {
  const { transferId, repo } = params

  // Получаем запрос на передачу
  const transfer = await repo.getTransferById(transferId)
  if (!transfer) {
    return { success: false, error: 'TRANSFER_NOT_FOUND' }
  }

  // Проверяем статус
  if (transfer.status !== 'PENDING') {
    return { success: false, error: 'TRANSFER_ALREADY_PROCESSED' }
  }

  // Обновляем статус запроса
  await repo.updateTransfer(transferId, {
    status: 'CANCELLED',
  })

  return { success: true }
}

export async function getTransfersByInstructor(params: {
  instructorId: string
  repo: TransferRepository
}): Promise<{ transfers: TransferData[] }> {
  const transfers = await params.repo.getTransfersByFromInstructor(params.instructorId)
  return { transfers }
}

export async function getPendingTransfersForInstructor(params: {
  instructorId: string
  repo: TransferRepository
}): Promise<{ transfers: TransferData[] }> {
  const transfers = await params.repo.getPendingTransfersByToInstructor(params.instructorId)
  return { transfers }
}
