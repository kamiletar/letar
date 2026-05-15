'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type {
  StudyGroup,
  StudyGroupMember,
  TheoryAttendance,
  TheoryLesson,
  TheoryTopic,
  User,
} from '@letar/driving-school-db/prisma'
import { revalidatePath } from 'next/cache'

// Типы для работы с теоретическими занятиями
export type TheoryLessonWithDetails = TheoryLesson & {
  topic: TheoryTopic
  group: StudyGroup & {
    members: (StudyGroupMember & {
      user: Pick<User, 'id' | 'name' | 'email' | 'image'>
    })[]
  }
  attendances: TheoryAttendance[]
  instructor: Pick<User, 'id' | 'name'> | null
}

export type AttendanceMember = {
  memberId: string
  userId: string
  userName: string | null
  userEmail: string | null
  userImage: string | null
  isPresent: boolean
  markedAt: Date | null
}

// Получить список теоретических занятий для инструктора/админа школы
export async function getTheoryLessonsAction(): Promise<{
  success: boolean
  lessons?: TheoryLessonWithDetails[]
  error?: string
}> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Не авторизован' }
  }

  try {
    const db = getEnhancedPrisma(session?.user)

    // Найти школы, где пользователь является админом, инструктором или преподавателем теории
    const memberships = await db.member.findMany({
      where: {
        userId: session.user.id,
        role: { in: ['owner', 'super_manager', 'manager', 'instructor', 'theory_instructor'] },
      },
      select: { organizationId: true },
    })

    const schoolIds = memberships.map((m: { organizationId: string }) => m.organizationId)

    if (schoolIds.length === 0) {
      return { success: true, lessons: [] }
    }

    // Получить все теоретические занятия этих школ
    const lessons = await db.theoryLesson.findMany({
      where: {
        group: {
          organizationId: { in: schoolIds },
        },
      },
      include: {
        topic: true,
        group: {
          include: {
            members: {
              where: { leftAt: null },
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            },
          },
        },
        attendances: true,
        instructor: {
          select: { id: true, name: true },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    })

    // Cast для совместимости типов JsonValue между ZenStack и Prisma
    return { success: true, lessons: lessons as unknown as TheoryLessonWithDetails[] }
  } catch (error) {
    console.error('Ошибка получения теоретических занятий:', error)
    return { success: false, error: 'Ошибка загрузки занятий' }
  }
}

// Получить занятие с посещаемостью
export async function getTheoryLessonWithAttendance(lessonId: string): Promise<{
  success: boolean
  lesson?: TheoryLessonWithDetails
  attendance?: AttendanceMember[]
  error?: string
}> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Не авторизован' }
  }

  try {
    const db = getEnhancedPrisma(session?.user)

    const lesson = await db.theoryLesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: true,
        group: {
          include: {
            members: {
              where: { leftAt: null },
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            },
          },
        },
        attendances: true,
        instructor: {
          select: { id: true, name: true },
        },
      },
    })

    if (!lesson) {
      return { success: false, error: 'Занятие не найдено' }
    }

    // Сформировать список участников с отметками посещаемости
    const attendance: AttendanceMember[] = lesson.group.members.map(
      (member: StudyGroupMember & { user: Pick<User, 'id' | 'name' | 'email' | 'image'> }) => {
        const att = lesson.attendances.find((a: TheoryAttendance) => a.memberId === member.id)
        return {
          memberId: member.id,
          userId: member.user.id,
          userName: member.user.name || 'Без имени',
          userEmail: member.user.email,
          userImage: member.user.image,
          isPresent: att?.isPresent ?? false,
          markedAt: att?.markedAt ?? null,
        }
      }
    )

    // Cast для совместимости типов JsonValue между ZenStack и Prisma
    return { success: true, lesson: lesson as unknown as TheoryLessonWithDetails, attendance }
  } catch (error) {
    console.error('Ошибка получения занятия:', error)
    return { success: false, error: 'Ошибка загрузки занятия' }
  }
}

// Отметить посещаемость
export async function markAttendanceAction(
  lessonId: string,
  memberId: string,
  isPresent: boolean
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Не авторизован' }
  }

  try {
    const db = getEnhancedPrisma(session?.user)

    // Проверить, что занятие существует
    const lesson = await db.theoryLesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    })

    if (!lesson) {
      return { success: false, error: 'Занятие не найдено' }
    }

    // Upsert посещаемости
    await db.theoryAttendance.upsert({
      where: {
        lessonId_memberId: { lessonId, memberId },
      },
      create: {
        lessonId,
        memberId,
        isPresent,
        markedAt: new Date(),
        markedById: session.user.id,
      },
      update: {
        isPresent,
        markedAt: new Date(),
        markedById: session.user.id,
      },
    })

    revalidatePath(`/theory-lessons/${lessonId}/attendance`)

    return { success: true }
  } catch (error) {
    console.error('Ошибка отметки посещаемости:', error)
    return { success: false, error: 'Ошибка сохранения' }
  }
}

// Массовая отметка посещаемости
export async function markBulkAttendanceAction(
  lessonId: string,
  attendances: { memberId: string; isPresent: boolean }[]
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Не авторизован' }
  }

  try {
    const db = getEnhancedPrisma(session?.user)

    // Проверить, что занятие существует
    const lesson = await db.theoryLesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    })

    if (!lesson) {
      return { success: false, error: 'Занятие не найдено' }
    }

    // Обновить все записи
    for (const att of attendances) {
      await db.theoryAttendance.upsert({
        where: {
          lessonId_memberId: { lessonId, memberId: att.memberId },
        },
        create: {
          lessonId,
          memberId: att.memberId,
          isPresent: att.isPresent,
          markedAt: new Date(),
          markedById: session.user.id,
        },
        update: {
          isPresent: att.isPresent,
          markedAt: new Date(),
          markedById: session.user.id,
        },
      })
    }

    revalidatePath(`/theory-lessons/${lessonId}/attendance`)

    return { success: true }
  } catch (error) {
    console.error('Ошибка массовой отметки посещаемости:', error)
    return { success: false, error: 'Ошибка сохранения' }
  }
}
