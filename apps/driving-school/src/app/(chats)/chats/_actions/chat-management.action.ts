'use server'

/**
 * Server Actions для управления чатами
 *
 * Создание, настройки, отметка прочитанности, управление участниками
 */

import { revalidatePath } from 'next/cache'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { UserRole } from '@letar/driving-school-db/prisma'

import {
  type CreatePrivateChatInput,
  CreatePrivateChatSchema,
  type MarkAsReadInput,
  MarkAsReadSchema,
  type UpdateChatSettingsInput,
  UpdateChatSettingsSchema,
} from '../_schemas/chat.schema'
import {
  addStudentToInstructorChat,
  getOrCreateInstructorStudentsChat,
  getOrCreatePrivateChat,
  getOrCreateSchoolChat,
  getOrCreateStudyGroupChat,
  getOrCreateSystemChat,
  markChatAsRead,
  removeStudentFromInstructorChat,
  updateChatSettings,
} from '../_services'

import type { ChatActionResult, CreateChatResult } from './chat.types'

// ============================================================================
// СОЗДАНИЕ ПРИВАТНОГО ЧАТА
// ============================================================================

export async function createPrivateChatAction(data: CreatePrivateChatInput): Promise<CreateChatResult> {
  const parsed = CreatePrivateChatSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  try {
    const { participantId } = parsed.data

    // Нельзя создать чат с самим собой
    if (participantId === session.user.id) {
      return { success: false, error: 'Нельзя создать чат с самим собой' }
    }

    const db = getEnhancedPrisma(session.user)

    // Проверяем, что пользователь существует
    const participant = await db.user.findUnique({
      where: { id: participantId, deletedAt: null },
    })

    if (!participant) {
      return { success: false, error: 'Пользователь не найден' }
    }

    const chatId = await getOrCreatePrivateChat(session.user.id, participantId)
    revalidatePath('/chats')
    return { success: true, chatId }
  } catch (error) {
    console.error('Ошибка создания чата:', error)
    return { success: false, error: 'Произошла ошибка при создании чата' }
  }
}

// ============================================================================
// ПОЛУЧЕНИЕ ИЛИ СОЗДАНИЕ ПРИВАТНОГО ЧАТА
// ============================================================================

export async function getOrCreatePrivateChatAction(participantId: string): Promise<CreateChatResult> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const chatId = await getOrCreatePrivateChat(session.user.id, participantId)
    revalidatePath('/chats')
    return { success: true, chatId }
  } catch (error) {
    if (error instanceof Error && error.message === 'CANNOT_CHAT_WITH_SELF') {
      return { success: false, error: 'CANNOT_CHAT_WITH_SELF' }
    }
    console.error('Ошибка создания чата:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// ============================================================================
// ОТМЕТКА ПРОЧТЕНИЯ
// ============================================================================

export async function markAsReadAction(data: MarkAsReadInput): Promise<ChatActionResult> {
  const parsed = MarkAsReadSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Чат не указан' }
  }

  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  try {
    const { chatId } = parsed.data
    await markChatAsRead(chatId, session.user.id)
    revalidatePath('/chats')
    return { success: true }
  } catch (error) {
    console.error('Ошибка отметки прочтения:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}

// Версия без формы для вызова напрямую
export async function markChatAsReadAction(chatId: string): Promise<{ success: boolean }> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false }
    }

    await markChatAsRead(chatId, session.user.id)
    return { success: true }
  } catch {
    return { success: false }
  }
}

// ============================================================================
// НАСТРОЙКИ ЧАТА (MUTE)
// ============================================================================

export async function updateChatSettingsAction(data: UpdateChatSettingsInput): Promise<ChatActionResult> {
  const parsed = UpdateChatSettingsSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  try {
    const { chatId, isMuted } = parsed.data
    await updateChatSettings(chatId, session.user.id, isMuted)
    revalidatePath(`/chats/${chatId}`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка обновления настроек:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}

// ============================================================================
// СИСТЕМНЫЕ ЧАТЫ (ИНСТРУКТОРЫ, УЧЕНИКИ, ОБЩИЙ)
// ============================================================================

export async function getOrCreateSystemChatAction(
  type: 'INSTRUCTORS' | 'STUDENTS' | 'GENERAL'
): Promise<CreateChatResult> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const chatId = await getOrCreateSystemChat(
      session.user.id,
      type,
      session.user.hasInstructorProfile ?? false,
      session.user.hasStudentProfile ?? false
    )

    return { success: true, chatId }
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return { success: false, error: 'FORBIDDEN' }
    }
    console.error('Ошибка системного чата:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// ============================================================================
// ЧАТ УЧЕБНОЙ ГРУППЫ
// ============================================================================

export async function getOrCreateStudyGroupChatAction(studyGroupId: string): Promise<CreateChatResult> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const chatId = await getOrCreateStudyGroupChat(session.user.id, studyGroupId)
    return { success: true, chatId }
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'NOT_FOUND':
          return { success: false, error: 'NOT_FOUND' }
        case 'FORBIDDEN':
          return { success: false, error: 'FORBIDDEN' }
      }
    }
    console.error('Ошибка чата группы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// ============================================================================
// ЧАТ ШКОЛЫ
// ============================================================================

export async function getOrCreateSchoolChatAction(organizationId: string): Promise<CreateChatResult> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const chatId = await getOrCreateSchoolChat(session.user.id, organizationId)
    return { success: true, chatId }
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return { success: false, error: 'FORBIDDEN' }
    }
    console.error('Ошибка чата школы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// ============================================================================
// ЧАТ ИНСТРУКТОРА С УЧЕНИКАМИ (INSTRUCTOR_STUDENTS)
// ============================================================================

/**
 * Получает или создаёт чат инструктора с учениками.
 *
 * Правила:
 * - Фрилансер (FREELANCE_INSTRUCTOR): один чат со всеми учениками (isFreelanceChat=true)
 * - Инструктор школы: отдельный чат для каждой школы (organizationId=X, isFreelanceChat=false)
 *
 * @param organizationId - ID школы (для школьного инструктора) или undefined (для фрилансера)
 */
export async function getOrCreateInstructorStudentsChatAction(organizationId?: string): Promise<CreateChatResult> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const chatId = await getOrCreateInstructorStudentsChat(
      session.user.id,
      session.user.roles as UserRole[],
      organizationId
    )
    return { success: true, chatId }
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return { success: false, error: 'FORBIDDEN' }
    }
    console.error('Ошибка чата инструктора с учениками:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Добавляет ученика в чат инструктора.
 * Вызывается при создании связи ученик-инструктор.
 *
 * @param instructorUserId - ID пользователя инструктора
 * @param studentUserId - ID пользователя ученика
 * @param organizationId - ID школы (если связь через школу)
 */
export async function addStudentToInstructorChatAction(
  instructorUserId: string,
  studentUserId: string,
  organizationId?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await addStudentToInstructorChat(instructorUserId, studentUserId, organizationId)
    return { success: true }
  } catch (error) {
    console.error('Ошибка добавления ученика в чат инструктора:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Удаляет ученика из чата инструктора (мягкое удаление).
 * Вызывается при разрыве связи ученик-инструктор.
 */
export async function removeStudentFromInstructorChatAction(
  instructorUserId: string,
  studentUserId: string,
  organizationId?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await removeStudentFromInstructorChat(instructorUserId, studentUserId, organizationId)
    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления ученика из чата инструктора:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
