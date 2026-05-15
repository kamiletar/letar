/**
 * Сервис для управления связями ученик-инструктор
 */
import type { ConnectionStatus, LicenseCategory, PrismaClient } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface CreateConnectionInput {
  studentId: string
  instructorId: string
  isPrimary?: boolean
  category?: LicenseCategory
}

export interface UpdateConnectionStatusInput {
  connectionId: string
  status: ConnectionStatus
}

export interface SetPrimaryInstructorInput {
  studentId: string
  connectionId: string
}

// === Дефолтные значения ===

export const CONNECTION_DEFAULTS = {
  status: 'ACTIVE' as const,
  isPrimary: false,
  prepaidLessons: 0,
  totalLessons: 0,
  completedLessons: 0,
  cancelledLessons: 0,
  noShowCount: 0,
}

// === Валидация статусов ===

export const VALID_STATUS_TRANSITIONS: Record<ConnectionStatus, ConnectionStatus[]> = {
  ACTIVE: ['PAUSED', 'DISCONNECTED'],
  PAUSED: ['ACTIVE', 'DISCONNECTED'],
  DISCONNECTED: [], // Финальный статус, нельзя изменить
}

/**
 * Проверяет, допустим ли переход между статусами
 */
export function isValidStatusTransition(from: ConnectionStatus, to: ConnectionStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to)
}

// === Сервис ===

/**
 * Создаёт новую связь ученик-инструктор с дефолтными значениями
 */
export async function createConnection(prisma: PrismaClient, input: CreateConnectionInput) {
  const { studentId, instructorId, isPrimary = false, category } = input

  // Проверяем, что связь ещё не существует
  const existing = await prisma.studentInstructorConnection.findUnique({
    where: {
      studentId_instructorId: { studentId, instructorId },
    },
  })

  if (existing) {
    throw new Error('CONNECTION_ALREADY_EXISTS')
  }

  return prisma.studentInstructorConnection.create({
    data: {
      studentId,
      instructorId,
      status: CONNECTION_DEFAULTS.status,
      isPrimary,
      prepaidLessons: CONNECTION_DEFAULTS.prepaidLessons,
      category,
      totalLessons: CONNECTION_DEFAULTS.totalLessons,
      completedLessons: CONNECTION_DEFAULTS.completedLessons,
      cancelledLessons: CONNECTION_DEFAULTS.cancelledLessons,
      noShowCount: CONNECTION_DEFAULTS.noShowCount,
    },
  })
}

/**
 * Устанавливает инструктора как основного для ученика
 * Снимает флаг isPrimary со всех других связей ученика
 */
export async function setPrimaryInstructor(prisma: PrismaClient, input: SetPrimaryInstructorInput) {
  const { studentId, connectionId } = input

  // Проверяем, что связь существует и принадлежит ученику
  const connection = await prisma.studentInstructorConnection.findUnique({
    where: { id: connectionId },
  })

  if (!connection) {
    throw new Error('CONNECTION_NOT_FOUND')
  }

  if (connection.studentId !== studentId) {
    throw new Error('CONNECTION_BELONGS_TO_ANOTHER_STUDENT')
  }

  // Снимаем isPrimary со всех связей ученика и устанавливаем на нужную
  await prisma.$transaction([
    prisma.studentInstructorConnection.updateMany({
      where: { studentId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.studentInstructorConnection.update({
      where: { id: connectionId },
      data: { isPrimary: true },
    }),
  ])

  return prisma.studentInstructorConnection.findUnique({
    where: { id: connectionId },
  })
}

/**
 * Изменяет статус связи с проверкой допустимости перехода
 */
export async function updateConnectionStatus(prisma: PrismaClient, input: UpdateConnectionStatusInput) {
  const { connectionId, status: newStatus } = input

  const connection = await prisma.studentInstructorConnection.findUnique({
    where: { id: connectionId },
  })

  if (!connection) {
    throw new Error('CONNECTION_NOT_FOUND')
  }

  if (!isValidStatusTransition(connection.status, newStatus)) {
    throw new Error(`INVALID_STATUS_TRANSITION: ${connection.status} -> ${newStatus}`)
  }

  return prisma.studentInstructorConnection.update({
    where: { id: connectionId },
    data: { status: newStatus },
  })
}

/**
 * Получает связь по ID
 */
export async function getConnectionById(prisma: PrismaClient, connectionId: string) {
  return prisma.studentInstructorConnection.findUnique({
    where: { id: connectionId },
    include: {
      student: { include: { user: true } },
      instructor: { include: { user: true } },
    },
  })
}

/**
 * Получает все связи ученика
 */
export async function getStudentConnections(prisma: PrismaClient, studentId: string) {
  return prisma.studentInstructorConnection.findMany({
    where: { studentId },
    include: {
      instructor: { include: { user: true } },
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })
}

/**
 * Получает все связи инструктора
 */
export async function getInstructorConnections(prisma: PrismaClient, instructorId: string) {
  return prisma.studentInstructorConnection.findMany({
    where: { instructorId },
    include: {
      student: { include: { user: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}
