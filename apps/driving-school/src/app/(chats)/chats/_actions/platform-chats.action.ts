'use server'

/**
 * Server Actions для платформенных чатов:
 * - PLATFORM_FEEDBACK — общий канал обратной связи
 * - PLATFORM_SUPPORT — приватный чат школы с поддержкой
 * - SCHOOL_STUDENT — чат школы с учеником
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

import type { CreateChatResult } from './chat.types'

// ============================================================================
// PLATFORM_FEEDBACK — общий канал обратной связи
// ============================================================================

/**
 * Получает или создаёт общий канал PLATFORM_FEEDBACK
 * Доступ: все менеджеры школ + OWNER платформы
 */
export async function getOrCreatePlatformFeedbackChatAction(): Promise<CreateChatResult> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const userId = session.user.id
  const isOwner = session.user.roles?.includes('OWNER')

  // Проверяем, что пользователь — менеджер школы или OWNER
  let isMemberOfAnyOrganization = false
  if (!isOwner) {
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
    })
    isMemberOfAnyOrganization = !!membership
  }

  if (!isOwner && !isMemberOfAnyOrganization) {
    return { success: false, error: 'FORBIDDEN' }
  }

  try {
    // Ищем существующий чат PLATFORM_FEEDBACK (singleton)
    let chat = await prisma.chat.findFirst({
      where: { type: 'PLATFORM_FEEDBACK' },
    })

    if (!chat) {
      // Создаём чат
      chat = await prisma.chat.create({
        data: {
          type: 'PLATFORM_FEEDBACK',
          name: 'Обратная связь с платформой',
        },
      })
    }

    // Проверяем/добавляем участие
    const participation = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: { chatId: chat.id, userId },
      },
    })

    if (!participation) {
      await prisma.chatParticipant.create({
        data: {
          chatId: chat.id,
          userId,
          isAdmin: isOwner,
        },
      })
    } else if (participation.leftAt) {
      await prisma.chatParticipant.update({
        where: { id: participation.id },
        data: { leftAt: null },
      })
    }

    return { success: true, chatId: chat.id }
  } catch (error) {
    console.error('getOrCreatePlatformFeedbackChatAction error:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

// ============================================================================
// PLATFORM_SUPPORT — приватный чат школы с поддержкой
// ============================================================================

/**
 * Получает или создаёт приватный чат школы с поддержкой платформы
 * Доступ: менеджеры конкретной школы + OWNER платформы
 */
export async function getOrCreatePlatformSupportChatAction(organizationId: string): Promise<CreateChatResult> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const userId = session.user.id
  const isOwner = session.user.roles?.includes('OWNER')

  // Проверяем, что пользователь — менеджер этой школы или OWNER
  let isSchoolManager = false
  if (!isOwner) {
    const membership = await prisma.member.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    })
    isSchoolManager = membership?.role ? ['owner', 'super_manager', 'manager'].includes(membership.role) : false
  }

  if (!isOwner && !isSchoolManager) {
    return { success: false, error: 'FORBIDDEN' }
  }

  try {
    // Получаем информацию о школе
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    })

    if (!organization) {
      return { success: false, error: 'ORGANIZATION_NOT_FOUND' }
    }

    // Ищем существующий чат PLATFORM_SUPPORT для этой школы
    let chat = await prisma.chat.findFirst({
      where: {
        type: 'PLATFORM_SUPPORT',
        organizationId,
      },
    })

    if (!chat) {
      // Создаём чат
      chat = await prisma.chat.create({
        data: {
          type: 'PLATFORM_SUPPORT',
          organizationId,
          name: `Поддержка: ${organization.name}`,
        },
      })

      // Автоматически добавляем всех OWNER платформы
      const owners = await prisma.user.findMany({
        where: {
          roles: { has: 'OWNER' },
        },
        select: { id: true },
      })

      if (owners.length > 0) {
        await prisma.chatParticipant.createMany({
          data: owners.map((owner: { id: string }) => ({
            chatId: chat!.id,
            userId: owner.id,
            isAdmin: true,
          })),
          skipDuplicates: true,
        })
      }
    }

    // Проверяем/добавляем участие текущего пользователя
    const participation = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: { chatId: chat.id, userId },
      },
    })

    if (!participation) {
      await prisma.chatParticipant.create({
        data: {
          chatId: chat.id,
          userId,
          isAdmin: isOwner,
        },
      })
    } else if (participation.leftAt) {
      await prisma.chatParticipant.update({
        where: { id: participation.id },
        data: { leftAt: null },
      })
    }

    return { success: true, chatId: chat.id }
  } catch (error) {
    console.error('getOrCreatePlatformSupportChatAction error:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

// ============================================================================
// SCHOOL_STUDENT — чат школы с учеником
// ============================================================================

/**
 * Получает или создаёт чат школы с учеником
 * Доступ: менеджеры школы + сам ученик
 */
export async function getOrCreateSchoolStudentChatAction(
  organizationId: string,
  studentUserId: string
): Promise<CreateChatResult> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const userId = session.user.id
  const isOwner = session.user.roles?.includes('OWNER')

  // Проверяем, что пользователь — менеджер школы или OWNER
  // Студенты НЕ могут создавать чаты (получают доступ через ZenStack policies после создания)
  let isSchoolManager = false
  if (!isOwner) {
    const membership = await prisma.member.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    })
    isSchoolManager = membership?.role ? ['owner', 'super_manager', 'manager'].includes(membership.role) : false
  }

  if (!isOwner && !isSchoolManager) {
    return { success: false, error: 'FORBIDDEN' }
  }

  try {
    // Получаем информацию о школе и ученике
    const [organization, student] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: studentUserId },
        select: { name: true },
      }),
    ])

    if (!organization) {
      return { success: false, error: 'ORGANIZATION_NOT_FOUND' }
    }

    if (!student) {
      return { success: false, error: 'STUDENT_NOT_FOUND' }
    }

    // Ищем существующий чат SCHOOL_STUDENT для пары школа+ученик
    let chat = await prisma.chat.findFirst({
      where: {
        type: 'SCHOOL_STUDENT',
        organizationId,
        studentUserId,
      },
    })

    if (!chat) {
      // Создаём чат
      chat = await prisma.chat.create({
        data: {
          type: 'SCHOOL_STUDENT',
          organizationId,
          studentUserId,
          name: `${organization.name} → ${student.name || 'Ученик'}`,
        },
      })

      // Добавляем ученика как участника
      await prisma.chatParticipant.create({
        data: {
          chatId: chat.id,
          userId: studentUserId,
          isAdmin: false,
        },
      })
    }

    // Проверяем/добавляем участие текущего пользователя (если это менеджер)
    if (userId !== studentUserId) {
      const participation = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: { chatId: chat.id, userId },
        },
      })

      if (!participation) {
        await prisma.chatParticipant.create({
          data: {
            chatId: chat.id,
            userId,
            isAdmin: true, // Менеджеры школы = админы чата
          },
        })
      } else if (participation.leftAt) {
        await prisma.chatParticipant.update({
          where: { id: participation.id },
          data: { leftAt: null },
        })
      }
    }

    return { success: true, chatId: chat.id }
  } catch (error) {
    console.error('getOrCreateSchoolStudentChatAction error:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

// ============================================================================
// ПОЛУЧЕНИЕ СПИСКА ПЛАТФОРМЕННЫХ ЧАТОВ
// ============================================================================

/**
 * Получает все PLATFORM_SUPPORT чаты для OWNER (для списка чатов поддержки)
 */
export async function getAllPlatformSupportChatsAction(): Promise<
  | { success: true; chats: Array<{ id: string; name: string | null; organizationId: string | null }> }
  | { success: false; error: string }
> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const isOwner = session.user.roles?.includes('OWNER')
  if (!isOwner) {
    return { success: false, error: 'FORBIDDEN' }
  }

  try {
    const chats = await prisma.chat.findMany({
      where: { type: 'PLATFORM_SUPPORT' },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    return { success: true, chats }
  } catch (error) {
    console.error('getAllPlatformSupportChatsAction error:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}

/**
 * Получает все SCHOOL_STUDENT чаты для школы (для менеджеров)
 */
export async function getSchoolStudentChatsAction(organizationId: string): Promise<
  | {
      success: true
      chats: Array<{
        id: string
        name: string | null
        studentUserId: string | null
        studentName: string | null
      }>
    }
  | { success: false; error: string }
> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const userId = session.user.id
  const isOwner = session.user.roles?.includes('OWNER')

  // Проверяем, что пользователь — менеджер школы или OWNER
  let isSchoolManager = false
  if (!isOwner) {
    const membership = await prisma.member.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    })
    isSchoolManager = membership?.role ? ['owner', 'super_manager', 'manager'].includes(membership.role) : false
  }

  if (!isOwner && !isSchoolManager) {
    return { success: false, error: 'FORBIDDEN' }
  }

  try {
    const chats = await prisma.chat.findMany({
      where: {
        type: 'SCHOOL_STUDENT',
        organizationId,
      },
      include: {
        studentUser: {
          select: { name: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    return {
      success: true,
      chats: chats.map(
        (chat: {
          id: string
          name: string | null
          studentUserId: string | null
          studentUser?: { name: string | null } | null
        }) => ({
          id: chat.id,
          name: chat.name,
          studentUserId: chat.studentUserId,
          studentName: chat.studentUser?.name || null,
        })
      ),
    }
  } catch (error) {
    console.error('getSchoolStudentChatsAction error:', error)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}
