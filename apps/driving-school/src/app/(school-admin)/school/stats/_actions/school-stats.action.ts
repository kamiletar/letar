'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

// === Типы статистики школы ===

export interface InstructorSummary {
  id: string
  userId: string
  name: string | null
  image: string | null
  totalStudents: number
  activeStudents: number
  totalLessons: number
  completedLessons: number
  cancelledLessons: number
  noShowCount: number
  totalPrepaidBalance: number
}

export interface SchoolLessonStats {
  total: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  noShow: number
}

export interface SchoolMemberStats {
  totalMembers: number
  admins: number
  instructors: number
  students: number
}

export interface SchoolStats {
  school: {
    id: string
    name: string
    logo: string | null
  }
  members: SchoolMemberStats
  lessons: SchoolLessonStats
  instructors: InstructorSummary[]
  period: {
    start: Date
    end: Date
  }
}

export type PeriodType = 'week' | 'month' | 'year' | 'all'

export type GetSchoolStatsResult =
  | { success: true; stats: SchoolStats }
  | { success: false; error: 'UNAUTHORIZED' | 'NOT_SCHOOL_ADMIN' | 'NO_SCHOOL' | 'UNKNOWN_ERROR' }

// === Получение статистики школы ===

export async function getSchoolStats(schoolId: string, period: PeriodType = 'month'): Promise<GetSchoolStatsResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    // ZenStack v3.2.1 баг: include с relations генерирует невалидный SQL
    // Используем prisma напрямую для запросов с relations
    const membership = await prisma.member.findFirst({
      where: {
        organizationId: schoolId,
        userId: session.user.id,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
      include: {
        organization: true,
      },
    })

    if (!membership) {
      return { success: false, error: 'NOT_SCHOOL_ADMIN' }
    }

    const school = membership.organization

    // Определяем период
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate = new Date(now)
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case 'all':
        startDate = new Date(0)
        break
    }

    // Получаем всех членов школы
    const members = await prisma.member.findMany({
      where: { organizationId: schoolId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    const memberStats: SchoolMemberStats = {
      totalMembers: members.length,
      admins: members.filter((m) => m.role === 'owner').length,
      instructors: members.filter((m) => m.role === 'instructor').length,
      students: members.filter((m) => m.role === 'member').length,
    }

    // Получаем ID инструкторов школы
    const instructorUserIds = members.filter((m) => m.role === 'instructor').map((m) => m.userId)

    // Получаем занятия инструкторов школы
    const lessons = await prisma.lesson.findMany({
      where: {
        instructorId: { in: instructorUserIds },
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        instructorId: true,
      },
    })

    const lessonStats: SchoolLessonStats = {
      total: lessons.length,
      pending: lessons.filter((l) => l.status === 'PENDING').length,
      confirmed: lessons.filter((l) => l.status === 'CONFIRMED').length,
      completed: lessons.filter((l) => l.status === 'COMPLETED').length,
      cancelled: lessons.filter((l) => l.status === 'CANCELLED').length,
      noShow: lessons.filter((l) => l.status === 'NO_SHOW').length,
    }

    // Получаем профили ВСЕХ инструкторов одним запросом (вместо N+1)
    const instructorProfiles = await prisma.instructorProfile.findMany({
      where: { userId: { in: instructorUserIds } },
      include: {
        studentConnections: true,
      },
    })

    // Создаём Map для быстрого доступа по userId
    type InstructorProfileWithConnections = (typeof instructorProfiles)[number]
    const profilesByUserId = new Map<string, InstructorProfileWithConnections>(
      instructorProfiles.map((p) => [p.userId, p])
    )

    // Группируем занятия по инструктору одним проходом
    const lessonsByInstructor = lessons.reduce(
      (acc, lesson) => {
        if (!acc[lesson.instructorId]) {
          acc[lesson.instructorId] = { total: 0, completed: 0, cancelled: 0, noShow: 0 }
        }
        acc[lesson.instructorId].total++
        if (lesson.status === 'COMPLETED') {
          acc[lesson.instructorId].completed++
        }
        if (lesson.status === 'CANCELLED') {
          acc[lesson.instructorId].cancelled++
        }
        if (lesson.status === 'NO_SHOW') {
          acc[lesson.instructorId].noShow++
        }
        return acc
      },
      {} as Record<string, { total: number; completed: number; cancelled: number; noShow: number }>
    )

    // Собираем статистику инструкторов без дополнительных запросов
    const instructorSummaries: InstructorSummary[] = members
      .filter((m) => m.role === 'instructor')
      .map((member) => {
        const profile = profilesByUserId.get(member.userId)
        if (!profile) {
          return null
        }

        const lessonStats = lessonsByInstructor[member.userId] || { total: 0, completed: 0, cancelled: 0, noShow: 0 }

        return {
          id: profile.id,
          userId: member.userId,
          name: member.user.name,
          image: member.user.image,
          totalStudents: profile.studentConnections.length,
          activeStudents: profile.studentConnections.filter((c) => c.status === 'ACTIVE').length,
          totalLessons: lessonStats.total,
          completedLessons: lessonStats.completed,
          cancelledLessons: lessonStats.cancelled,
          noShowCount: lessonStats.noShow,
          totalPrepaidBalance: profile.studentConnections.reduce((sum, c) => sum + c.prepaidLessons, 0),
        }
      })
      .filter((s): s is InstructorSummary => s !== null)

    // Сортируем инструкторов по количеству завершённых занятий
    instructorSummaries.sort((a, b) => b.completedLessons - a.completedLessons)

    return {
      success: true,
      stats: {
        school: {
          id: school.id,
          name: school.name,
          logo: school.logo,
        },
        members: memberStats,
        lessons: lessonStats,
        instructors: instructorSummaries,
        period: {
          start: startDate,
          end: now,
        },
      },
    }
  } catch (error) {
    console.error('Ошибка получения статистики школы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение списка школ пользователя ===

export interface UserSchool {
  id: string
  name: string
  logo: string | null
  role: string
}

export type GetUserSchoolsResult =
  | { success: true; schools: UserSchool[] }
  | { success: false; error: 'UNAUTHORIZED' | 'UNKNOWN_ERROR' }

export async function getUserSchools(): Promise<GetUserSchoolsResult> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    // ZenStack v3.2.1 баг: include с relations генерирует невалидный SQL
    // Используем prisma напрямую для запросов с relations
    const memberships = await prisma.member.findMany({
      where: {
        userId: session.user.id,
        role: { in: ['owner', 'super_manager', 'manager'] }, // Школы, где пользователь админ или менеджер
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    })

    const schools: UserSchool[] = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      logo: m.organization.logo,
      role: m.role,
    }))

    return { success: true, schools }
  } catch (error) {
    console.error('Ошибка получения школ:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
