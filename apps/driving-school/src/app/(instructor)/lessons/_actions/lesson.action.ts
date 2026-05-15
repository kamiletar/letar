'use server'

import { type AuthError, withInstructor } from '@/lib/action-helpers'
import { type BalanceRepository, deductPrepaidLesson } from '@/lib/balance'
import { prisma } from '@/lib/db'
import {
  cancelLesson,
  type CancelLessonRepository,
  completeLesson,
  type CompleteLessonRepository,
  confirmLesson,
  type ConfirmLessonRepository,
  createLesson,
  type CreateLessonRepository,
  markNoShow,
} from '@/lib/lessons/lesson-service'
import { dispatchWebhookEvent } from '@/lib/webhooks'
import { revalidatePath } from 'next/cache'

// === Helper: получение organizationId инструктора ===

async function getInstructorOrganizationId(instructorId: string): Promise<string | null> {
  const membership = await prisma.member.findFirst({
    where: { userId: instructorId },
    select: { organizationId: true },
  })
  return membership?.organizationId ?? null
}

// === Helper: создание репозитория для баланса ===

function createBalanceRepository(): BalanceRepository {
  return {
    getConnection: async (studentId, instructorId) => {
      const connection = await prisma.studentInstructorConnection.findFirst({
        where: { studentId, instructorId },
      })
      return connection
    },
    updatePrepaidBalance: async (connectionId, newBalance) => {
      await prisma.studentInstructorConnection.update({
        where: { id: connectionId },
        data: { prepaidLessons: newBalance },
      })
    },
  }
}

// === Типы результатов ===

export type GetLessonsResult =
  | { success: true; lessons: LessonWithDetails[] }
  | { success: false; error: AuthError | 'UNKNOWN_ERROR' }

export type LessonActionResult = { success: true } | { success: false; error: string }

export interface LessonWithDetails {
  id: string
  status: string
  createdAt: Date
  instructorNotes: string | null
  cancelledBy: string | null
  cancelledAt: Date | null
  cancelReason: string | null
  slot: {
    id: string
    startTime: Date
    endTime: Date
  }
  student: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

// === Получение списка занятий ===

export async function getInstructorLessons(): Promise<GetLessonsResult> {
  return withInstructor(async (user) => {
    try {
      // Используем prisma напрямую вместо getEnhancedPrisma
      // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
      const lessons = await prisma.lesson.findMany({
        where: {
          instructorId: user.id,
        },
        include: {
          slot: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return { success: true, lessons }
    } catch (error) {
      console.error('Ошибка получения занятий:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Получение списка занятий с пагинацией ===

export interface GetLessonsPaginatedParams {
  statusFilter?: string
  cursor?: number // offset для пагинации
  take?: number
}

export type GetLessonsPaginatedResult =
  | { success: true; lessons: LessonWithDetails[]; hasMore: boolean }
  | { success: false; error: AuthError | 'UNKNOWN_ERROR' }

export async function getInstructorLessonsPaginated(
  params: GetLessonsPaginatedParams
): Promise<GetLessonsPaginatedResult> {
  return withInstructor(async (user) => {
    try {
      const take = params.take ?? 20
      const skip = params.cursor ?? 0

      // Используем prisma напрямую вместо getEnhancedPrisma
      // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
      const lessons = await prisma.lesson.findMany({
        where: {
          instructorId: user.id,
          ...(params.statusFilter && params.statusFilter !== 'ALL'
            ? { status: params.statusFilter as 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' }
            : {}),
        },
        include: {
          slot: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: take + 1, // +1 чтобы определить есть ли ещё
      })

      // Определяем, есть ли ещё записи
      const hasMore = lessons.length > take
      const resultLessons = hasMore ? lessons.slice(0, take) : lessons

      // Преобразуем к ожидаемому типу
      const typedLessons: LessonWithDetails[] = resultLessons.map((l) => ({
        id: l.id,
        status: l.status,
        createdAt: l.createdAt,
        instructorNotes: l.instructorNotes,
        cancelledBy: l.cancelledBy,
        cancelledAt: l.cancelledAt,
        cancelReason: l.cancelReason,
        slot: {
          id: l.slot.id,
          startTime: l.slot.startTime,
          endTime: l.slot.endTime,
        },
        student: {
          id: l.student.id,
          name: l.student.name,
          email: l.student.email,
          image: l.student.image,
        },
      }))

      return { success: true, lessons: typedLessons, hasMore }
    } catch (error) {
      console.error('Ошибка получения занятий:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Подтверждение занятия ===

export async function confirmLessonAction(lessonId: string): Promise<LessonActionResult> {
  return withInstructor(async (user) => {
    try {
      const repo: ConfirmLessonRepository = {
        getLesson: async (id) => {
          const lesson = await prisma.lesson.findUnique({
            where: { id },
            include: {
              slot: {
                select: { startTime: true, endTime: true },
              },
            },
          })
          return lesson
        },
        getStudentLessonsForConflictCheck: async (studentId, excludeLessonId) => {
          // Получаем профиль студента
          const studentProfile = await prisma.studentProfile.findFirst({
            where: { userId: studentId },
          })
          if (!studentProfile) {
            return []
          }
          // Получаем все активные занятия ученика (PENDING и CONFIRMED), кроме текущего
          const lessons = await prisma.lesson.findMany({
            where: {
              studentId: studentProfile.id,
              id: { not: excludeLessonId },
              status: { in: ['PENDING', 'CONFIRMED'] },
            },
            include: {
              slot: {
                select: { startTime: true, endTime: true },
              },
            },
          })
          return lessons
        },
        updateLessonStatus: async (id, status) => {
          const updated = await prisma.lesson.update({
            where: { id },
            data: { status },
          })
          return updated
        },
      }

      const result = await confirmLesson(lessonId, user.id, repo)

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          LESSON_NOT_FOUND: 'Занятие не найдено',
          NOT_AUTHORIZED: 'Нет прав для подтверждения',
          INVALID_STATUS: 'Занятие уже подтверждено или отменено',
          STUDENT_TIME_CONFLICT: 'У ученика уже есть занятие в это время',
        }
        return { success: false, error: errorMessages[result.error] || 'Ошибка' }
      }

      revalidatePath('/lessons')

      // Dispatch webhook (fire-and-forget)
      const organizationId = await getInstructorOrganizationId(user.id)
      if (organizationId) {
        const lesson = await prisma.lesson.findUnique({
          where: { id: lessonId },
          include: {
            slot: { select: { startTime: true, endTime: true } },
            student: { select: { id: true, name: true, email: true } },
          },
        })
        if (lesson) {
          dispatchWebhookEvent(organizationId, 'LESSON_CONFIRMED', lessonId, {
            lesson: {
              id: lesson.id,
              status: lesson.status,
              startTime: lesson.slot.startTime,
              endTime: lesson.slot.endTime,
            },
            student: lesson.student,
            instructorId: user.id,
          })
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка подтверждения занятия:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

// === Отмена занятия ===

export async function cancelLessonAction(lessonId: string, reason?: string): Promise<LessonActionResult> {
  return withInstructor(async (user) => {
    try {
      const repo: CancelLessonRepository = {
        getLesson: async (id) => {
          const lesson = await prisma.lesson.findUnique({ where: { id } })
          return lesson
        },
        getSlot: async (slotId) => {
          const slot = await prisma.timeSlot.findUnique({ where: { id: slotId } })
          return slot
        },
        getInstructorProfile: async (instructorId) => {
          const profile = await prisma.instructorProfile.findFirst({
            where: { userId: instructorId },
          })
          return profile
        },
        updateLesson: async (id, data) => {
          const updated = await prisma.lesson.update({
            where: { id },
            data,
          })
          return updated
        },
        updateSlotStatus: async (slotId, status) => {
          await prisma.timeSlot.update({
            where: { id: slotId },
            data: { status },
          })
        },
      }

      const result = await cancelLesson(lessonId, user.id, reason, repo)

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          LESSON_NOT_FOUND: 'Занятие не найдено',
          NOT_AUTHORIZED: 'Нет прав для отмены',
          INVALID_STATUS: 'Занятие уже завершено или отменено',
        }
        return { success: false, error: errorMessages[result.error] || 'Ошибка' }
      }

      revalidatePath('/lessons')

      // Dispatch webhook (fire-and-forget)
      const organizationId = await getInstructorOrganizationId(user.id)
      if (organizationId) {
        const lesson = await prisma.lesson.findUnique({
          where: { id: lessonId },
          include: {
            slot: { select: { startTime: true, endTime: true } },
            student: { select: { id: true, name: true, email: true } },
          },
        })
        if (lesson) {
          dispatchWebhookEvent(organizationId, 'LESSON_CANCELLED', lessonId, {
            lesson: {
              id: lesson.id,
              status: lesson.status,
              cancelReason: lesson.cancelReason,
              cancelledAt: lesson.cancelledAt,
              startTime: lesson.slot.startTime,
              endTime: lesson.slot.endTime,
            },
            student: lesson.student,
            instructorId: user.id,
          })
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка отмены занятия:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

// === Завершение занятия ===

export async function completeLessonAction(lessonId: string, notes?: string): Promise<LessonActionResult> {
  return withInstructor(async (user) => {
    try {
      const repo: CompleteLessonRepository = {
        getLesson: async (id) => {
          const lesson = await prisma.lesson.findUnique({ where: { id } })
          return lesson
        },
        updateLesson: async (id, data) => {
          const updated = await prisma.lesson.update({
            where: { id },
            data,
          })
          return updated
        },
        updateConnectionStats: async (studentId, instructorId, completionType) => {
          // Находим профиль студента
          const studentProfile = await prisma.studentProfile.findFirst({
            where: { userId: studentId },
          })
          // Находим профиль инструктора
          const instructorProfile = await prisma.instructorProfile.findFirst({
            where: { userId: instructorId },
          })

          if (!studentProfile || !instructorProfile) {
            return
          }

          // Типизированный объект для обновления статистики
          const updateData: {
            completedLessons?: { increment: number }
            cancelledLessons?: { increment: number }
            noShowCount?: { increment: number }
          } = {}
          if (completionType === 'COMPLETED') {
            updateData.completedLessons = { increment: 1 }
          } else if (completionType === 'NO_SHOW') {
            updateData.noShowCount = { increment: 1 }
          } else if (completionType === 'CANCELLED') {
            updateData.cancelledLessons = { increment: 1 }
          }

          await prisma.studentInstructorConnection.updateMany({
            where: {
              studentId: studentProfile.id,
              instructorId: instructorProfile.id,
            },
            data: updateData,
          })
        },
      }

      const result = await completeLesson(lessonId, user.id, notes, repo)

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          LESSON_NOT_FOUND: 'Занятие не найдено',
          NOT_AUTHORIZED: 'Нет прав для завершения',
          INVALID_STATUS: 'Занятие не подтверждено или уже завершено',
        }
        return { success: false, error: errorMessages[result.error] || 'Ошибка' }
      }

      // Списываем предоплаченное занятие (если есть баланс)
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } })
      if (lesson) {
        const studentProfile = await prisma.studentProfile.findFirst({
          where: { userId: lesson.studentId },
        })
        const instructorProfile = await prisma.instructorProfile.findFirst({
          where: { userId: lesson.instructorId },
        })

        if (studentProfile && instructorProfile) {
          const balanceRepo = createBalanceRepository()
          // Игнорируем ошибку, если баланс нулевой — занятие уже завершено
          await deductPrepaidLesson(studentProfile.id, instructorProfile.id, 'COMPLETED', balanceRepo)
        }
      }

      revalidatePath('/lessons')

      // Dispatch webhook (fire-and-forget)
      const organizationId = await getInstructorOrganizationId(user.id)
      if (organizationId) {
        const lesson = await prisma.lesson.findUnique({
          where: { id: lessonId },
          include: {
            slot: { select: { startTime: true, endTime: true } },
            student: { select: { id: true, name: true, email: true } },
          },
        })
        if (lesson) {
          dispatchWebhookEvent(organizationId, 'LESSON_COMPLETED', lessonId, {
            lesson: {
              id: lesson.id,
              status: lesson.status,
              instructorNotes: lesson.instructorNotes,
              startTime: lesson.slot.startTime,
              endTime: lesson.slot.endTime,
            },
            student: lesson.student,
            instructorId: user.id,
          })
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка завершения занятия:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

// === Отметка неявки ===

export async function markNoShowAction(lessonId: string): Promise<LessonActionResult> {
  return withInstructor(async (user) => {
    try {
      const repo: CompleteLessonRepository = {
        getLesson: async (id) => {
          const lesson = await prisma.lesson.findUnique({ where: { id } })
          return lesson
        },
        updateLesson: async (id, data) => {
          const updated = await prisma.lesson.update({
            where: { id },
            data,
          })
          return updated
        },
        updateConnectionStats: async (studentId, instructorId, _type) => {
          const studentProfile = await prisma.studentProfile.findFirst({
            where: { userId: studentId },
          })
          const instructorProfile = await prisma.instructorProfile.findFirst({
            where: { userId: instructorId },
          })

          if (!studentProfile || !instructorProfile) {
            return
          }

          await prisma.studentInstructorConnection.updateMany({
            where: {
              studentId: studentProfile.id,
              instructorId: instructorProfile.id,
            },
            data: { noShowCount: { increment: 1 } },
          })
        },
      }

      const result = await markNoShow(lessonId, user.id, repo)

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          LESSON_NOT_FOUND: 'Занятие не найдено',
          NOT_AUTHORIZED: 'Нет прав для отметки неявки',
          INVALID_STATUS: 'Занятие не подтверждено или уже завершено',
        }
        return { success: false, error: errorMessages[result.error] || 'Ошибка' }
      }

      // Списываем предоплаченное занятие за неявку (если есть баланс)
      const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } })
      if (lesson) {
        const studentProfile = await prisma.studentProfile.findFirst({
          where: { userId: lesson.studentId },
        })
        const instructorProfile = await prisma.instructorProfile.findFirst({
          where: { userId: lesson.instructorId },
        })

        if (studentProfile && instructorProfile) {
          const balanceRepo = createBalanceRepository()
          // Игнорируем ошибку, если баланс нулевой
          await deductPrepaidLesson(studentProfile.id, instructorProfile.id, 'NO_SHOW', balanceRepo)
        }
      }

      revalidatePath('/lessons')

      // Dispatch webhook (fire-and-forget)
      const organizationId = await getInstructorOrganizationId(user.id)
      if (organizationId) {
        const lesson = await prisma.lesson.findUnique({
          where: { id: lessonId },
          include: {
            slot: { select: { startTime: true, endTime: true } },
            student: { select: { id: true, name: true, email: true } },
          },
        })
        if (lesson) {
          dispatchWebhookEvent(organizationId, 'LESSON_NO_SHOW', lessonId, {
            lesson: {
              id: lesson.id,
              status: lesson.status,
              startTime: lesson.slot.startTime,
              endTime: lesson.slot.endTime,
            },
            student: lesson.student,
            instructorId: user.id,
          })
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка отметки неявки:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

// === Создание занятия (инструктором для ученика) ===

export async function createLessonAction(slotId: string, studentId: string): Promise<LessonActionResult> {
  return withInstructor(async (user) => {
    try {
      const repo: CreateLessonRepository = {
        getSlot: async (id) => {
          const slot = await prisma.timeSlot.findUnique({ where: { id } })
          return slot
        },
        getConnection: async (studId, instrId) => {
          const studentProfile = await prisma.studentProfile.findFirst({
            where: { userId: studId },
          })
          const instructorProfile = await prisma.instructorProfile.findFirst({
            where: { userId: instrId },
          })

          if (!studentProfile || !instructorProfile) {
            return null
          }

          const connection = await prisma.studentInstructorConnection.findFirst({
            where: {
              studentId: studentProfile.id,
              instructorId: instructorProfile.id,
            },
          })
          return connection
        },
        getInstructorProfile: async (instructorId) => {
          const profile = await prisma.instructorProfile.findFirst({
            where: { userId: instructorId },
          })
          return profile
        },
        getStudentLessons: async (studId) => {
          // Получаем профиль студента
          const studentProfile = await prisma.studentProfile.findFirst({
            where: { userId: studId },
          })
          if (!studentProfile) {
            return []
          }
          // Получаем все активные занятия ученика (PENDING и CONFIRMED)
          const lessons = await prisma.lesson.findMany({
            where: {
              studentId: studentProfile.id,
              status: { in: ['PENDING', 'CONFIRMED'] },
            },
            include: {
              slot: {
                select: { startTime: true, endTime: true },
              },
            },
          })
          return lessons
        },
        createLessonInDb: async (data) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lesson = await prisma.lesson.create({ data: data as any })
          return lesson
        },
        updateSlotStatus: async (id, status) => {
          await prisma.timeSlot.update({
            where: { id },
            data: { status },
          })
        },
      }

      const result = await createLesson(
        {
          slotId,
          studentId,
          instructorId: user.id,
          createdBy: user.id,
        },
        repo
      )

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          SLOT_NOT_FOUND: 'Слот не найден',
          SLOT_NOT_AVAILABLE: 'Слот уже занят',
          NO_CONNECTION: 'Нет связи с учеником',
          CONNECTION_NOT_ACTIVE: 'Связь с учеником неактивна',
          STUDENT_TIME_CONFLICT: 'У ученика уже есть занятие в это время',
        }
        return { success: false, error: errorMessages[result.error] || 'Ошибка' }
      }

      revalidatePath('/lessons')
      revalidatePath('/schedule')
      return { success: true }
    } catch (error) {
      console.error('Ошибка создания занятия:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}
