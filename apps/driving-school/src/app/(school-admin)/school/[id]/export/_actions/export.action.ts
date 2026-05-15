'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { UserRole } from '@letar/driving-school-db/prisma'

// Проверка прав доступа к школе
async function checkSchoolAccess(schoolId: string, userId: string, user: { id: string; roles: UserRole[] }) {
  const db = getEnhancedPrisma(user)
  const membership = await db.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: schoolId,
        userId,
      },
    },
  })

  if (!membership) {
    return { success: false as const, error: 'NOT_MEMBER' }
  }

  // Только owner, super_manager и manager могут экспортировать
  if (!['owner', 'super_manager', 'manager'].includes(membership.role)) {
    return { success: false as const, error: 'NOT_AUTHORIZED' }
  }

  return { success: true as const, role: membership.role }
}

// Получение информации о школе для страницы экспорта
export async function getSchoolForExport(schoolId: string) {
  const session = await getSession()

  if (!session?.user) {
    return { success: false as const, error: 'NOT_AUTHENTICATED' }
  }

  const accessResult = await checkSchoolAccess(schoolId, session.user.id, session.user)
  if (!accessResult.success) {
    return { success: false as const, error: accessResult.error }
  }

  const db = getEnhancedPrisma(session.user)
  const school = await db.organization.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          members: true,
        },
      },
    },
  })

  if (!school) {
    return { success: false as const, error: 'NOT_FOUND' }
  }

  // Получаем статистику для предпросмотра
  const [studentCount, instructorCount, lessonCount] = await Promise.all([
    db.member.count({
      where: { organizationId: schoolId, role: 'member' },
    }),
    db.member.count({
      where: { organizationId: schoolId, role: 'instructor' },
    }),
    // Подсчитаем занятия инструкторов школы
    (async () => {
      const instructors = await db.member.findMany({
        where: { organizationId: schoolId, role: 'instructor' },
        select: { userId: true },
      })
      const instructorIds = instructors.map((i) => i.userId)
      return db.lesson.count({
        where: { instructorId: { in: instructorIds } },
      })
    })(),
  ])

  return {
    success: true as const,
    school,
    stats: {
      studentCount,
      instructorCount,
      lessonCount,
    },
  }
}

// Получение списка инструкторов для фильтра
export async function getSchoolInstructors(schoolId: string) {
  const session = await getSession()

  if (!session?.user) {
    return { success: false as const, error: 'NOT_AUTHENTICATED' }
  }

  const accessResult = await checkSchoolAccess(schoolId, session.user.id, session.user)
  if (!accessResult.success) {
    return { success: false as const, error: accessResult.error }
  }

  const db = getEnhancedPrisma(session.user)
  const instructors = await db.member.findMany({
    where: {
      organizationId: schoolId,
      role: 'instructor',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  })

  return {
    success: true as const,
    instructors: instructors.map((m) => ({
      id: m.userId,
      name: m.user.name || m.user.email,
    })),
  }
}
