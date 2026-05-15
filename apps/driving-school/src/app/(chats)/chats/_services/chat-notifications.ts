/**
 * Сервис уведомлений для чатов
 *
 * Отправляет push, email и telegram уведомления участникам чата.
 */

import { getAppUrl } from '@/lib/app-url'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/notifications'
import { createNotificationProviders, createOrchestratorRepository } from '@/lib/orchestrator-repository'

import type { ChatType } from '@letar/driving-school-db/prisma'

// ============================================================================
// УВЕДОМЛЕНИЯ О СООБЩЕНИЯХ
// ============================================================================

export interface NotifyChatParticipantsParams {
  chatId: string
  authorId: string
  authorName: string
  messageContent: string
  chatName: string | null
  chatType: ChatType
}

/**
 * Отправляет уведомления участникам чата о новом сообщении
 *
 * Push, Email и Telegram уведомления отправляются асинхронно через оркестратор.
 * Real-time обновление счетчика непрочитанных происходит через SSE.
 */
export async function notifyChatParticipants(params: NotifyChatParticipantsParams): Promise<void> {
  const { chatId, authorId, authorName, messageContent, chatName, chatType } = params

  // Получаем всех участников чата (кроме автора и тех, кто замутил чат)
  const participants = await prisma.chatParticipant.findMany({
    where: {
      chatId,
      userId: { not: authorId },
      leftAt: null,
      isMuted: false,
    },
    select: { userId: true },
  })

  if (participants.length === 0) {
    return
  }

  const orchestratorRepo = createOrchestratorRepository()
  const providers = createNotificationProviders()
  const appUrl = getAppUrl()

  // Формируем название чата для уведомления
  const displayChatName =
    chatType === 'PRIVATE' ? `от ${authorName}` : chatName ? `в чате «${chatName}»` : 'в групповом чате'

  // Обрезаем сообщение для уведомления
  const truncatedContent = messageContent.length > 100 ? messageContent.slice(0, 100) + '...' : messageContent

  // Отправляем уведомления всем участникам
  await Promise.all(
    participants.map((p: { userId: string }) =>
      notifyUser({
        userId: p.userId,
        type: 'CHAT_MESSAGE',
        title: chatType === 'PRIVATE' ? `Новое сообщение от ${authorName}` : `Новое сообщение ${displayChatName}`,
        body: truncatedContent,
        data: {
          chatId,
          authorId,
          authorName,
        },
        repo: orchestratorRepo,
        providers,
        appUrl,
      })
    )
  )
}

/**
 * Отправляет SSE уведомления для обновления счетчика непрочитанных
 */
export async function notifyChatUpdateSSE(participantIds: string[]): Promise<void> {
  if (participantIds.length === 0) {
    return
  }

  const { notifyChatUpdate } = await import('@/lib/sse/notify-chat-update')
  notifyChatUpdate(participantIds)
}
