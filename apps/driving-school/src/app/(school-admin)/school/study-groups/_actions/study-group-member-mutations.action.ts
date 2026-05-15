'use server'

/**
 * Server Actions для мутаций участников групп
 */

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

import { canManageGroup } from './study-group-member-utils'
import type { AddMemberResult, BulkAddMembersResult, RemoveMemberResult } from './study-group-member.types'

// === Добавление участника в группу ===

export async function addMemberToGroupAction(groupId: string, userId: string): Promise<AddMemberResult> {
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

    // Проверяем существование пользователя
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' }
    }

    // Проверяем, что пользователь — студент школы
    const membership = await db.member.findFirst({
      where: {
        userId,
        organizationId,
        role: 'member',
      },
    })

    if (!membership) {
      return { success: false, error: 'NOT_SCHOOL_STUDENT', message: 'Пользователь не является студентом этой школы' }
    }

    // Проверяем, что пользователь ещё не в группе
    const existingMember = await db.studyGroupMember.findFirst({
      where: {
        groupId,
        userId,
        leftAt: null, // Только активные
      },
    })

    if (existingMember) {
      return { success: false, error: 'ALREADY_MEMBER', message: 'Пользователь уже состоит в группе' }
    }

    // Проверяем, не заполнена ли группа
    const group = await db.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { leftAt: null },
        },
      },
    })

    if (group && group.members.length >= group.maxStudents) {
      return {
        success: false,
        error: 'GROUP_FULL',
        message: `Группа заполнена (максимум ${group.maxStudents} учеников)`,
      }
    }

    // Добавляем участника
    const newMember = await db.studyGroupMember.create({
      data: {
        groupId,
        userId,
        enrolledAt: new Date(),
      },
    })

    // Добавляем в чат группы (если есть)
    const groupChat = await db.chat.findFirst({
      where: {
        type: 'STUDY_GROUP',
        studyGroupId: groupId,
      },
    })

    if (groupChat) {
      // Проверяем, что пользователь ещё не в чате
      const existingParticipant = await db.chatParticipant.findFirst({
        where: {
          chatId: groupChat.id,
          userId,
        },
      })

      if (!existingParticipant) {
        await db.chatParticipant.create({
          data: {
            chatId: groupChat.id,
            userId,
            isAdmin: false,
          },
        })
      }
    }

    return { success: true, memberId: newMember.id }
  } catch (error) {
    console.error('Ошибка добавления участника:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Массовое добавление участников ===

export async function bulkAddMembersAction(groupId: string, userIds: string[]): Promise<BulkAddMembersResult> {
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

    // Получаем группу с текущими участниками
    const group = await db.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { leftAt: null },
          select: { userId: true },
        },
      },
    })

    if (!group) {
      return { success: false, error: 'GROUP_NOT_FOUND' }
    }

    const existingUserIds = new Set(group.members.map((m) => m.userId))
    const availableSlots = group.maxStudents - group.members.length

    // Фильтруем только студентов школы
    const schoolStudents = await db.member.findMany({
      where: {
        organizationId,
        role: 'member',
        userId: { in: userIds },
      },
      select: { userId: true },
    })

    const validUserIds = schoolStudents.map((s) => s.userId)

    // Отфильтровываем уже добавленных
    const newUserIds = validUserIds.filter((id) => !existingUserIds.has(id))

    // Ограничиваем количеством доступных мест
    const usersToAdd = newUserIds.slice(0, availableSlots)
    const skipped = newUserIds.length - usersToAdd.length + (userIds.length - validUserIds.length)

    if (usersToAdd.length === 0) {
      return { success: true, addedCount: 0, skippedCount: skipped }
    }

    // Добавляем участников
    await db.studyGroupMember.createMany({
      data: usersToAdd.map((uId) => ({
        groupId,
        userId: uId,
        enrolledAt: new Date(),
      })),
    })

    // Добавляем в чат группы
    const groupChat = await db.chat.findFirst({
      where: {
        type: 'STUDY_GROUP',
        studyGroupId: groupId,
      },
    })

    if (groupChat) {
      // Получаем существующих участников чата
      const existingChatParticipants = await db.chatParticipant.findMany({
        where: {
          chatId: groupChat.id,
          userId: { in: usersToAdd },
        },
        select: { userId: true },
      })

      const existingChatUserIds = new Set(existingChatParticipants.map((p) => p.userId))
      const newChatParticipants = usersToAdd.filter((id) => !existingChatUserIds.has(id))

      if (newChatParticipants.length > 0) {
        await db.chatParticipant.createMany({
          data: newChatParticipants.map((uId) => ({
            chatId: groupChat.id,
            userId: uId,
            isAdmin: false,
          })),
        })
      }
    }

    return { success: true, addedCount: usersToAdd.length, skippedCount: skipped }
  } catch (error) {
    console.error('Ошибка массового добавления участников:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Удаление участника из группы (soft delete) ===

export async function removeMemberFromGroupAction(memberId: string): Promise<RemoveMemberResult> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(session.user)

    // Получаем участника и группу
    const member = await db.studyGroupMember.findUnique({
      where: { id: memberId },
      include: {
        group: {
          select: { id: true, organizationId: true },
        },
      },
    })

    if (!member) {
      return { success: false, error: 'MEMBER_NOT_FOUND' }
    }

    // Проверяем права админа или менеджера школы
    const canManageResult = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: member.group.organizationId,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
    })

    if (!canManageResult) {
      return { success: false, error: 'NOT_SCHOOL_ADMIN' }
    }

    // Soft delete — устанавливаем дату выхода
    await db.studyGroupMember.update({
      where: { id: memberId },
      data: { leftAt: new Date() },
    })

    // Удаляем из чата группы
    const groupChat = await db.chat.findFirst({
      where: {
        type: 'STUDY_GROUP',
        studyGroupId: member.group.id,
      },
    })

    if (groupChat) {
      await db.chatParticipant.deleteMany({
        where: {
          chatId: groupChat.id,
          userId: member.userId,
        },
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления участника:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Восстановление участника (отмена soft delete) ===

export async function restoreMemberAction(memberId: string): Promise<AddMemberResult> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const db = getEnhancedPrisma(session.user)

    // Получаем участника и группу
    const member = await db.studyGroupMember.findUnique({
      where: { id: memberId },
      include: {
        group: {
          select: {
            id: true,
            organizationId: true,
            maxStudents: true,
            members: {
              where: { leftAt: null },
            },
          },
        },
      },
    })

    if (!member) {
      return { success: false, error: 'USER_NOT_FOUND' }
    }

    // Проверяем права админа или менеджера школы
    const canManageResult = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: member.group.organizationId,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
    })

    if (!canManageResult) {
      return { success: false, error: 'NOT_SCHOOL_ADMIN' }
    }

    // Проверяем, не заполнена ли группа
    if (member.group.members.length >= member.group.maxStudents) {
      return {
        success: false,
        error: 'GROUP_FULL',
        message: `Группа заполнена (максимум ${member.group.maxStudents} учеников)`,
      }
    }

    // Восстанавливаем участника
    await db.studyGroupMember.update({
      where: { id: memberId },
      data: { leftAt: null },
    })

    // Добавляем обратно в чат
    const groupChat = await db.chat.findFirst({
      where: {
        type: 'STUDY_GROUP',
        studyGroupId: member.group.id,
      },
    })

    if (groupChat) {
      const existingParticipant = await db.chatParticipant.findFirst({
        where: {
          chatId: groupChat.id,
          userId: member.userId,
        },
      })

      if (!existingParticipant) {
        await db.chatParticipant.create({
          data: {
            chatId: groupChat.id,
            userId: member.userId,
            isAdmin: false,
          },
        })
      }
    }

    return { success: true, memberId: member.id }
  } catch (error) {
    console.error('Ошибка восстановления участника:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
