'use server'

/**
 * Server Actions для работы с сообщениями чата
 */

import { revalidatePath } from 'next/cache'

import { getSession } from '@/lib/auth'
import type { ChatType } from '@letar/driving-school-db/prisma'

import {
  type DeleteMessageInput,
  DeleteMessageSchema,
  type EditMessageInput,
  EditMessageSchema,
  type SendMessageInput,
  SendMessageSchema,
  type ToggleReactionInput,
  ToggleReactionSchema,
} from '../_schemas/chat.schema'
import { notifyChatParticipants, notifyChatUpdateSSE } from '../_services'
import { deleteMessage, editMessage, sendMessage, toggleReaction } from '../_services/message-service'

import type { ChatActionResult, SendMessageResult } from './chat.types'

// === Отправка сообщения ===

export async function sendMessageAction(data: SendMessageInput): Promise<SendMessageResult> {
  const parsed = SendMessageSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Введите сообщение' }
  }

  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  try {
    const { chatId, content, replyToId } = parsed.data
    const userId = session.user.id

    const sendResult = await sendMessage({
      chatId,
      authorId: userId,
      content,
      replyToId,
    })

    // Отправляем SSE уведомления для обновления счетчика непрочитанных
    const participantIds = sendResult.chatInfo.participantIds.filter((id) => id !== userId)
    if (participantIds.length > 0) {
      notifyChatUpdateSSE(participantIds)
    }

    // Отправляем push/email/telegram уведомления (асинхронно, не блокируем ответ)
    notifyChatParticipants({
      chatId,
      authorId: userId,
      authorName: sendResult.authorName || 'Пользователь',
      messageContent: content,
      chatName: sendResult.chatInfo.name,
      chatType: sendResult.chatInfo.type as ChatType,
    }).catch((error) => {
      console.error('Failed to send chat notifications:', error)
    })

    revalidatePath(`/chats/${chatId}`)
    return { success: true, messageId: sendResult.messageId }
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return { success: false, error: 'У вас нет доступа к этому чату' }
    }
    console.error('Ошибка отправки сообщения:', error)
    return { success: false, error: 'Произошла ошибка при отправке сообщения' }
  }
}

// === Редактирование сообщения ===

export async function editMessageAction(data: EditMessageInput): Promise<ChatActionResult> {
  const parsed = EditMessageSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Введите сообщение' }
  }

  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  try {
    const { messageId, content } = parsed.data
    const chatId = await editMessage(messageId, session.user.id, content)
    revalidatePath(`/chats/${chatId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'NOT_FOUND':
          return { success: false, error: 'Сообщение не найдено' }
        case 'FORBIDDEN':
          return { success: false, error: 'Вы можете редактировать только свои сообщения' }
        case 'MESSAGE_DELETED':
          return { success: false, error: 'Сообщение удалено' }
      }
    }
    console.error('Ошибка редактирования сообщения:', error)
    return { success: false, error: 'Произошла ошибка при редактировании сообщения' }
  }
}

// === Удаление сообщения ===

export async function deleteMessageAction(data: DeleteMessageInput): Promise<ChatActionResult> {
  const parsed = DeleteMessageSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Сообщение не указано' }
  }

  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  try {
    const { messageId } = parsed.data
    const chatId = await deleteMessage(messageId, session.user.id)
    revalidatePath(`/chats/${chatId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'NOT_FOUND':
          return { success: false, error: 'Сообщение не найдено' }
        case 'FORBIDDEN':
          return { success: false, error: 'Вы можете удалять только свои сообщения' }
      }
    }
    console.error('Ошибка удаления сообщения:', error)
    return { success: false, error: 'Произошла ошибка при удалении сообщения' }
  }
}

// === Реакция на сообщение ===

export async function toggleReactionAction(data: ToggleReactionInput): Promise<ChatActionResult> {
  const parsed = ToggleReactionSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Выберите реакцию' }
  }

  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  try {
    const { messageId, emoji } = parsed.data
    const chatId = await toggleReaction(messageId, session.user.id, emoji)
    revalidatePath(`/chats/${chatId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'NOT_FOUND':
          return { success: false, error: 'Сообщение не найдено' }
        case 'FORBIDDEN':
          return { success: false, error: 'У вас нет доступа к этому чату' }
      }
    }
    console.error('Ошибка реакции:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}
