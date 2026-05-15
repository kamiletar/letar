'use server'

import { withAuth } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import type {
  ExamAttempt,
  ExamRegistration,
  ExamSessionStatus,
  ExamType,
  LicenseCategory,
  User,
} from '@letar/driving-school-db/prisma'
import type { Decimal } from 'decimal.js'
import { revalidatePath } from 'next/cache'

// Типы для работы с экзаменами
// Явно определяем тип вместо наследования от ExamSession,
// т.к. после миграции School → Organization поля изменились (schoolId → organizationId)
// ZenStack v3: _count не поддерживается, используем registrations.length
export type ExamSessionWithDetails = {
  id: string
  organizationId: string
  type: ExamType
  category: LicenseCategory
  scheduledAt: Date
  location: string | null
  maxStudents: number
  status: ExamSessionStatus
  price: Decimal | null
  createdAt: Date
  updatedAt: Date
  registrations: (ExamRegistration & {
    user: Pick<User, 'id' | 'name' | 'email' | 'image'>
    attempt: ExamAttempt | null
  })[]
  registrationsCount?: number // вычисляется из registrations.length
}

export type ExamRegistrationWithUser = ExamRegistration & {
  user: Pick<User, 'id' | 'name' | 'email' | 'image'>
  attempt: ExamAttempt | null
}

// Маппинг типов экзаменов вынесен в _constants/exam-types.ts

// Получить список экзаменов для школы
export async function getExamSessionsAction(): Promise<{
  success: boolean
  sessions?: ExamSessionWithDetails[]
  error?: string
}> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)

      // Найти организации, где пользователь является админом или инструктором
      const memberships = await db.member.findMany({
        where: {
          userId: user.id,
          role: { in: ['owner', 'super_manager', 'manager', 'instructor'] },
        },
        select: { organizationId: true },
      })

      const organizationIds = memberships.map((m: { organizationId: string }) => m.organizationId)

      if (organizationIds.length === 0) {
        return { success: true, sessions: [] }
      }

      // Получить все экзамены этих организаций
      const sessions = await db.examSession.findMany({
        where: {
          organizationId: { in: organizationIds },
        },
        include: {
          registrations: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
              attempt: true,
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
      })

      // ZenStack v3: вычисляем count из registrations.length
      const sessionsWithCount = sessions.map((s) => ({
        ...s,
        registrationsCount: s.registrations.length,
      }))

      return { success: true, sessions: sessionsWithCount }
    } catch (error) {
      console.error('Ошибка получения экзаменов:', error)
      return { success: false, error: 'Ошибка загрузки экзаменов' }
    }
  })
}

// Получить экзамен с участниками
export async function getExamSessionWithRegistrations(sessionId: string): Promise<{
  success: boolean
  session?: ExamSessionWithDetails
  error?: string
}> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)

      const session = await db.examSession.findUnique({
        where: { id: sessionId },
        include: {
          registrations: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
              attempt: true,
            },
          },
        },
      })

      if (!session) {
        return { success: false, error: 'Экзамен не найден' }
      }

      // ZenStack v3: вычисляем count из registrations.length
      return {
        success: true,
        session: {
          ...session,
          registrationsCount: session.registrations.length,
        },
      }
    } catch (error) {
      console.error('Ошибка получения экзамена:', error)
      return { success: false, error: 'Ошибка загрузки экзамена' }
    }
  })
}

// Выставить результат экзамена
export async function setExamResultAction(
  registrationId: string,
  result: 'PASSED' | 'FAILED' | 'NO_SHOW',
  score?: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)

      // Получить регистрацию
      const registration = await db.examRegistration.findUnique({
        where: { id: registrationId },
        include: { session: true },
      })

      if (!registration) {
        return { success: false, error: 'Запись не найдена' }
      }

      // Создать или обновить попытку
      await db.examAttempt.upsert({
        where: { registrationId },
        create: {
          sessionId: registration.sessionId,
          registrationId,
          userId: registration.userId,
          result,
          score,
          notes,
          gradedById: user.id,
          gradedAt: new Date(),
        },
        update: {
          result,
          score,
          notes,
          gradedById: user.id,
          gradedAt: new Date(),
        },
      })

      revalidatePath(`/exams/${registration.sessionId}/results`)

      return { success: true }
    } catch (error) {
      console.error('Ошибка выставления результата:', error)
      return { success: false, error: 'Ошибка сохранения' }
    }
  })
}

// Массовое выставление результатов
export async function setBulkExamResultsAction(
  results: { registrationId: string; result: 'PASSED' | 'FAILED' | 'NO_SHOW'; score?: number }[]
): Promise<{ success: boolean; error?: string }> {
  return withAuth(async (user) => {
    try {
      const db = getEnhancedPrisma(user)

      for (const r of results) {
        const registration = await db.examRegistration.findUnique({
          where: { id: r.registrationId },
          select: { sessionId: true, userId: true },
        })

        if (!registration) {
          continue
        }

        await db.examAttempt.upsert({
          where: { registrationId: r.registrationId },
          create: {
            sessionId: registration.sessionId,
            registrationId: r.registrationId,
            userId: registration.userId,
            result: r.result,
            score: r.score,
            gradedById: user.id,
            gradedAt: new Date(),
          },
          update: {
            result: r.result,
            score: r.score,
            gradedById: user.id,
            gradedAt: new Date(),
          },
        })
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка массового выставления результатов:', error)
      return { success: false, error: 'Ошибка сохранения' }
    }
  })
}
