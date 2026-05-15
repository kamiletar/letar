'use server'

import { revalidatePath } from 'next/cache'

import { requireInstructor } from '@/lib/action-helpers'
import { addPrepaidLessons, type BalanceRepository, getPrepaidBalance } from '@/lib/balance'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import type { DbClient } from '@/lib/db-types'
import type { ConnectionStatus, LicenseCategory, TransmissionType } from '@letar/driving-school-db/prisma'

import { type AddBalanceData, AddBalanceSchema } from '../_schemas/add-balance.schema'

// === Типы результатов ===

export interface StudentLicenseInfo {
  id: string
  category: LicenseCategory
  transmissionRestriction: TransmissionType | null
  obtainedAt: Date
  expiresAt: Date
  isVerified: boolean
  verifiedAt: Date | null
}

export interface StudentBalanceInfo {
  connectionId: string
  studentId: string
  studentUserId: string
  studentName: string
  studentEmail: string
  studentImage: string | null
  balance: number
  status: string
  licenses: StudentLicenseInfo[]
}

export type GetBalanceResult =
  | { success: true; data: StudentBalanceInfo }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NO_PROFILE'
        | 'STUDENT_NOT_FOUND'
        | 'NO_CONNECTION'
    }

// === Создание репозитория ===

function createBalanceRepository(db: DbClient): BalanceRepository {
  return {
    getConnection: async (studentId, instructorId) => {
      const connection = await db.studentInstructorConnection.findFirst({
        where: {
          studentId,
          instructorId,
        },
      })
      return connection
    },
    updatePrepaidBalance: async (connectionId, newBalance) => {
      await db.studentInstructorConnection.update({
        where: { id: connectionId },
        data: { prepaidLessons: newBalance },
      })
    },
  }
}

// === Получение баланса ученика ===

export async function getStudentBalance(studentUserId: string): Promise<GetBalanceResult> {
  try {
    const authResult = await requireInstructor()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }
    const { instructorProfileId, user } = authResult
    const db = getEnhancedPrisma(user)

    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    // Используем prisma напрямую для запросов с include
    const studentProfile = await prisma.studentProfile.findFirst({
      where: { userId: studentUserId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        studentLicenses: {
          orderBy: { category: 'asc' },
        },
      },
    })

    if (!studentProfile) {
      return { success: false, error: 'STUDENT_NOT_FOUND' }
    }

    // Получаем баланс через сервис
    const repo = createBalanceRepository(db)
    const result = await getPrepaidBalance(studentProfile.id, instructorProfileId, repo)

    if (!result.success) {
      return { success: false, error: 'NO_CONNECTION' }
    }

    // Получаем статус связи
    const connection = await prisma.studentInstructorConnection.findFirst({
      where: {
        studentId: studentProfile.id,
        instructorId: instructorProfileId,
      },
    })

    if (!connection) {
      return { success: false, error: 'NO_CONNECTION' }
    }

    return {
      success: true,
      data: {
        connectionId: connection.id,
        studentId: studentProfile.id,
        studentUserId: studentProfile.user.id,
        studentName: studentProfile.user.name || 'Без имени',
        studentEmail: studentProfile.user.email,
        studentImage: studentProfile.user.image,
        balance: result.balance,
        status: connection.status,
        licenses: studentProfile.studentLicenses.map((l) => ({
          id: l.id,
          category: l.category,
          transmissionRestriction: l.transmissionRestriction,
          obtainedAt: l.obtainedAt,
          expiresAt: l.expiresAt,
          isVerified: l.isVerified,
          verifiedAt: l.verifiedAt,
        })),
      },
    }
  } catch (error) {
    console.error('Ошибка получения баланса:', error)
    return { success: false, error: 'UNAUTHORIZED' }
  }
}

// === Пополнение баланса ===

export type AddBalanceResult = { success: true; newBalance: number } | { success: false; error: string }

export async function addBalanceAction(studentUserId: string, data: AddBalanceData): Promise<AddBalanceResult> {
  const parsed = AddBalanceSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const authResult = await requireInstructor()
  if (!authResult.success) {
    return {
      success: false,
      error: authResult.error === 'UNAUTHORIZED' ? 'Необходимо войти в систему' : 'Только для инструкторов',
    }
  }
  const { instructorProfileId, user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    // Находим профиль ученика
    const studentProfile = await db.studentProfile.findFirst({
      where: { userId: studentUserId },
    })

    if (!studentProfile) {
      return { success: false, error: 'Ученик не найден' }
    }

    // Пополняем баланс
    const repo = createBalanceRepository(db)
    const addResult = await addPrepaidLessons(studentProfile.id, instructorProfileId, parsed.data.amount, repo)

    if (!addResult.success) {
      const errorMessages: Record<string, string> = {
        CONNECTION_NOT_FOUND: 'Связь с учеником не найдена',
        CONNECTION_NOT_ACTIVE: 'Связь с учеником неактивна',
        INVALID_AMOUNT: 'Неверное количество занятий',
        EXCEEDS_LIMIT: 'Превышен лимит предоплаченных занятий (максимум 50)',
      }
      return { success: false, error: errorMessages[addResult.error] || 'Ошибка пополнения' }
    }

    revalidatePath(`/students/${studentUserId}/balance`)
    revalidatePath(`/students/${studentUserId}`)
    revalidatePath('/students')

    return { success: true, newBalance: addResult.newBalance }
  } catch (error) {
    console.error('Ошибка пополнения баланса:', error)
    return { success: false, error: 'Произошла ошибка при пополнении баланса' }
  }
}

// === Получение списка учеников с балансами ===

export interface StudentLicenseSummary {
  category: string
  isVerified: boolean
  transmissionRestriction: string | null
  isExpired: boolean
}

export interface StudentWithBalance {
  studentUserId: string
  studentName: string
  studentEmail: string
  studentImage: string | null
  balance: number
  status: string
  completedLessons: number
  noShowCount: number
  licenses: StudentLicenseSummary[]
}

export type GetStudentsBalancesResult =
  | { success: true; students: StudentWithBalance[] }
  | {
      success: false
      error: 'UNAUTHORIZED' | 'NOT_INSTRUCTOR' | 'NOT_OWNER' | 'NOT_SCHOOL_ADMIN' | 'NOT_SCHOOL_MEMBER' | 'NO_PROFILE'
    }

export async function getStudentsWithBalances(): Promise<GetStudentsBalancesResult> {
  try {
    const authResult = await requireInstructor()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }
    const { instructorProfileId } = authResult

    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    // Получаем всех учеников с балансами через prisma напрямую
    const connections = await prisma.studentInstructorConnection.findMany({
      where: {
        instructorId: instructorProfileId,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            studentLicenses: {
              orderBy: { category: 'asc' },
            },
          },
        },
      },
      orderBy: {
        student: {
          user: {
            name: 'asc',
          },
        },
      },
    })

    const now = new Date()
    const students: StudentWithBalance[] = connections.map((conn) => ({
      studentUserId: conn.student.user.id,
      studentName: conn.student.user.name || 'Без имени',
      studentEmail: conn.student.user.email,
      studentImage: conn.student.user.image,
      balance: conn.prepaidLessons,
      status: conn.status,
      completedLessons: conn.completedLessons,
      noShowCount: conn.noShowCount,
      licenses: conn.student.studentLicenses.map((l) => ({
        category: l.category,
        isVerified: l.isVerified,
        transmissionRestriction: l.transmissionRestriction,
        isExpired: l.expiresAt < now,
      })),
    }))

    return { success: true, students }
  } catch (error) {
    console.error('Ошибка получения списка учеников:', error)
    return { success: false, error: 'UNAUTHORIZED' }
  }
}

// === Управление статусом связи ===

export type UpdateConnectionStatusResult =
  | { success: true; newStatus: ConnectionStatus }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NO_PROFILE'
        | 'STUDENT_NOT_FOUND'
        | 'NO_CONNECTION'
        | 'INVALID_STATUS'
    }

export async function updateConnectionStatus(
  studentUserId: string,
  newStatus: ConnectionStatus
): Promise<UpdateConnectionStatusResult> {
  try {
    const authResult = await requireInstructor()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }
    const { instructorProfileId, user } = authResult
    const db = getEnhancedPrisma(user)

    // Находим профиль ученика
    const studentProfile = await db.studentProfile.findFirst({
      where: { userId: studentUserId },
    })

    if (!studentProfile) {
      return { success: false, error: 'STUDENT_NOT_FOUND' }
    }

    // Находим связь
    const connection = await db.studentInstructorConnection.findFirst({
      where: {
        studentId: studentProfile.id,
        instructorId: instructorProfileId,
      },
    })

    if (!connection) {
      return { success: false, error: 'NO_CONNECTION' }
    }

    // Валидация перехода статуса
    const validTransitions: Record<ConnectionStatus, ConnectionStatus[]> = {
      ACTIVE: ['PAUSED', 'DISCONNECTED'],
      PAUSED: ['ACTIVE', 'DISCONNECTED'],
      DISCONNECTED: [], // Из DISCONNECTED нельзя вернуться
    }

    if (!validTransitions[connection.status].includes(newStatus)) {
      return { success: false, error: 'INVALID_STATUS' }
    }

    // Обновляем статус
    await db.studentInstructorConnection.update({
      where: { id: connection.id },
      data: { status: newStatus },
    })

    revalidatePath('/students')
    revalidatePath(`/students/${studentUserId}`)
    revalidatePath(`/students/${studentUserId}/balance`)

    return { success: true, newStatus }
  } catch (error) {
    console.error('Ошибка изменения статуса связи:', error)
    return { success: false, error: 'UNAUTHORIZED' }
  }
}
