'use server'

/**
 * Server Actions для получения данных об участниках групп
 */

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

import { canManageGroup } from './study-group-member-utils'
import type {
  AvailableStudent,
  GetAvailableStudentsResult,
  GetGroupMembersResult,
  GroupMemberDetails,
} from './study-group-member.types'

// === Получение доступных студентов для добавления в группу ===

export async function getAvailableStudentsAction(groupId: string): Promise<GetAvailableStudentsResult> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(session.user)

    // Проверяем права и получаем organizationId
    const { canManage, organizationId } = await canManageGroup(session.user.id, groupId, session.user)

    if (!organizationId) {
      return { success: false, error: 'GROUP_NOT_FOUND' }
    }

    if (!canManage) {
      return { success: false, error: 'NOT_SCHOOL_ADMIN' }
    }

    // Получаем уже добавленных участников группы
    const existingMembers = await db.studyGroupMember.findMany({
      where: {
        groupId,
        leftAt: null, // Только активные участники
      },
      select: { userId: true },
    })

    const existingUserIds = existingMembers.map((m) => m.userId)

    // Получаем студентов школы, которые ещё не в группе
    const schoolStudents = await db.member.findMany({
      where: {
        organizationId,
        role: 'member',
        userId: { notIn: existingUserIds },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: { name: 'asc' },
      },
    })

    const students: AvailableStudent[] = schoolStudents.map((m) => ({
      id: m.user.id,
      name: m.user.name || 'Без имени',
      image: m.user.image,
      email: m.user.email,
    }))

    return { success: true, students }
  } catch (error) {
    console.error('Ошибка получения доступных студентов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение участников группы с детальной статистикой ===

export async function getGroupMembersAction(groupId: string): Promise<GetGroupMembersResult> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(session.user)

    // Проверяем права
    const { canManage, organizationId } = await canManageGroup(session.user.id, groupId, session.user)

    if (!organizationId) {
      return { success: false, error: 'GROUP_NOT_FOUND' }
    }

    if (!canManage) {
      return { success: false, error: 'NOT_SCHOOL_ADMIN' }
    }

    // Получаем всех участников группы (включая вышедших)
    const members = await db.studyGroupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
      orderBy: [
        { leftAt: 'asc' }, // Сначала активные (leftAt = null)
        { enrolledAt: 'asc' },
      ],
    })

    // Получаем все завершённые занятия группы
    const completedLessons = await db.theoryLesson.findMany({
      where: {
        groupId,
        status: 'COMPLETED',
      },
      select: { id: true },
    })

    const lessonIds = completedLessons.map((l) => l.id)

    // Формируем статистику для каждого участника
    const memberDetails: GroupMemberDetails[] = await Promise.all(
      members.map(async (member) => {
        // Получаем посещаемость участника
        const attendances = await db.theoryAttendance.findMany({
          where: {
            memberId: member.id,
            lessonId: { in: lessonIds },
          },
          select: { isPresent: true },
        })

        const attended = attendances.filter((a) => a.isPresent).length
        const total = attendances.length

        return {
          id: member.id,
          userId: member.userId,
          userName: member.user.name || 'Без имени',
          userImage: member.user.image,
          userEmail: member.user.email,
          enrolledAt: member.enrolledAt,
          leftAt: member.leftAt,
          attendanceStats: {
            total,
            attended,
            rate: total > 0 ? Math.round((attended / total) * 100) : null,
          },
        }
      })
    )

    return { success: true, members: memberDetails }
  } catch (error) {
    console.error('Ошибка получения участников группы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
