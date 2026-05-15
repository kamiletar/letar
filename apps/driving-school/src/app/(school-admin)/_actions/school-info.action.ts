'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'

export interface SchoolInfo {
  id: string
  name: string
  logo: string | null
  role: string
  /** Счётчики для навигации (disabled-логика) */
  coursesCount: number
  studyGroupsCount: number
  theoryTopicsCount: number
}

export type GetSchoolInfoResult =
  | { success: true; school: SchoolInfo }
  | { success: false; error: 'UNAUTHORIZED' | 'NOT_MEMBER' | 'NOT_FOUND' }

export async function getSchoolInfoAction(schoolId: string): Promise<GetSchoolInfoResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const db = getEnhancedPrisma(session.user)
  const membership = await db.member.findFirst({
    where: {
      organizationId: schoolId,
      userId: session.user.id,
      role: { in: ['owner', 'super_manager', 'manager'] },
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

  if (!membership) {
    return { success: false, error: 'NOT_MEMBER' }
  }

  // Счётчики для disabled-логики навигации
  const [coursesCount, studyGroupsCount, theoryTopicsCount] = await Promise.all([
    prisma.trainingCourse.count({ where: { organizationId: schoolId, isActive: true } }),
    prisma.studyGroup.count({ where: { organizationId: schoolId, isActive: true } }),
    prisma.theoryTopic.count({ where: { organizationId: schoolId, isActive: true } }),
  ])

  return {
    success: true,
    school: {
      id: membership.organization.id,
      name: membership.organization.name,
      logo: membership.organization.logo,
      role: membership.role,
      coursesCount,
      studyGroupsCount,
      theoryTopicsCount,
    },
  }
}

// === Получение списка школ пользователя ===

export interface UserSchoolItem {
  id: string
  name: string
  logo: string | null
  role: string
}

export type GetUserSchoolsResult =
  | { success: true; schools: UserSchoolItem[] }
  | { success: false; error: 'UNAUTHORIZED' }

export async function getUserSchoolsAction(): Promise<GetUserSchoolsResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const db = getEnhancedPrisma(session.user)
  const memberships = await db.member.findMany({
    where: {
      userId: session.user.id,
      role: { in: ['owner', 'super_manager', 'manager'] },
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
    orderBy: {
      organization: { name: 'asc' },
    },
  })

  const schools: UserSchoolItem[] = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    logo: m.organization.logo,
    role: m.role,
  }))

  return { success: true, schools }
}
