/**
 * Сервис операций с сообщениями
 *
 * Содержит чистые функции для работы с сообщениями чата.
 */

import { prisma } from '@/lib/db'

// ============================================================================
// ОТПРАВКА СООБЩЕНИЯ
// ============================================================================

export interface SendMessageParams {
  chatId: string
  authorId: string
  content: string
  replyToId?: string
}

export interface SendMessageResult {
  messageId: string
  createdAt: Date
  chatInfo: {
    type: string
    name: string | null
    participantIds: string[]
  }
  authorName: string | null
}

/**
 * Отправляет сообщение в чат
 * @returns Информация для отправки уведомлений
 */
export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const { chatId, authorId, content, replyToId } = params

  // Проверяем, что пользователь участник чата
  const participation = await prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: { chatId, userId: authorId },
    },
  })

  if (!participation || participation.leftAt) {
    throw new Error('FORBIDDEN')
  }

  // Создаём сообщение
  const message = await prisma.chatMessage.create({
    data: {
      chatId,
      authorId,
      content,
      replyToId: replyToId || null,
    },
  })

  // Обновляем lastMessageAt в чате
  await prisma.chat.update({
    where: { id: chatId },
    data: {
      lastMessageId: message.id,
      lastMessageAt: message.createdAt,
    },
  })

  // Обновляем lastReadAt для автора
  await prisma.chatParticipant.update({
    where: { chatId_userId: { chatId, userId: authorId } },
    data: { lastReadAt: new Date() },
  })

  // Получаем информацию о чате и авторе для уведомлений
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      type: true,
      name: true,
      participants: {
        where: {
          leftAt: null,
        },
        select: {
          userId: true,
        },
      },
    },
  })

  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { name: true },
  })

  if (!chat) {
    throw new Error('CHAT_NOT_FOUND')
  }

  return {
    messageId: message.id,
    createdAt: message.createdAt,
    chatInfo: {
      type: chat.type,
      name: chat.name,
      participantIds: chat.participants.map((p) => p.userId),
    },
    authorName: author?.name ?? null,
  }
}

// ============================================================================
// РЕДАКТИРОВАНИЕ СООБЩЕНИЯ
// ============================================================================

/**
 * Редактирует сообщение
 * @returns chatId для revalidatePath
 */
export async function editMessage(messageId: string, authorId: string, newContent: string): Promise<string> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  })

  if (!message) {
    throw new Error('NOT_FOUND')
  }

  if (message.authorId !== authorId) {
    throw new Error('FORBIDDEN')
  }

  if (message.deletedAt) {
    throw new Error('MESSAGE_DELETED')
  }

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      content: newContent,
      editedAt: new Date(),
    },
  })

  return message.chatId
}

// ============================================================================
// УДАЛЕНИЕ СООБЩЕНИЯ
// ============================================================================

/**
 * Удаляет сообщение (мягкое удаление)
 * @returns chatId для revalidatePath
 */
export async function deleteMessage(messageId: string, authorId: string): Promise<string> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  })

  if (!message) {
    throw new Error('NOT_FOUND')
  }

  if (message.authorId !== authorId) {
    throw new Error('FORBIDDEN')
  }

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  })

  return message.chatId
}

// ============================================================================
// РЕАКЦИИ НА СООБЩЕНИЯ
// ============================================================================

/**
 * Переключает реакцию на сообщение
 * @returns chatId для revalidatePath
 */
export async function toggleReaction(messageId: string, userId: string, emoji: string): Promise<string> {
  // Проверяем сообщение
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { chat: true },
  })

  if (!message || message.deletedAt) {
    throw new Error('NOT_FOUND')
  }

  // Проверяем, что пользователь участник чата
  const participation = await prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: { chatId: message.chatId, userId },
    },
  })

  if (!participation || participation.leftAt) {
    throw new Error('FORBIDDEN')
  }

  // Проверяем, есть ли уже такая реакция
  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
  })

  if (existing) {
    // Удаляем реакцию
    await prisma.messageReaction.delete({
      where: { id: existing.id },
    })
  } else {
    // Добавляем реакцию
    await prisma.messageReaction.create({
      data: { messageId, userId, emoji },
    })
  }

  return message.chatId
}
