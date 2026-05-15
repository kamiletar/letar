'use server'

/**
 * Server Actions для получения данных о чатах
 */

import { getSession } from '@/lib/auth'

import { getChatDetails, getUserChats, getUserContacts } from '../_services'
import type { GetChatResult, GetChatsResult, GetContactsResult } from './chat.types'

// === Получение списка чатов ===

export async function getChatsAction(): Promise<GetChatsResult> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const chats = await getUserChats(session.user.id)
    return { success: true, chats }
  } catch (error) {
    console.error('Ошибка получения чатов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение чата с сообщениями ===

export async function getChatAction(chatId: string): Promise<GetChatResult> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const chat = await getChatDetails(chatId, session.user.id)
    if (!chat) {
      return { success: false, error: 'NOT_FOUND' }
    }

    return { success: true, chat }
  } catch (error) {
    console.error('Ошибка получения чата:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение контактов для нового чата ===

export async function getContactsAction(): Promise<GetContactsResult> {
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const contacts = await getUserContacts(
      session.user.id,
      session.user.hasStudentProfile ?? false,
      session.user.hasInstructorProfile ?? false
    )

    return { success: true, contacts }
  } catch (error) {
    console.error('Ошибка получения контактов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
