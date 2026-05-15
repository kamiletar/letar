/**
 * Типы для работы с чатами
 */

import type { ChatDetails, ChatMessage, ChatSummary, Contact } from '../_services'

// === Результаты запросов ===

export type GetChatsResult = { success: true; chats: ChatSummary[] } | { success: false; error: string }

export type GetChatResult = { success: true; chat: ChatDetails } | { success: false; error: string }

export type GetMessagesResult =
  | { success: true; messages: ChatMessage[]; hasMore: boolean }
  | { success: false; error: string }

export type GetContactsResult = { success: true; contacts: Contact[] } | { success: false; error: string }

// === Результаты мутаций ===

export type ChatActionResult = { success: true } | { success: false; error: string }

export type SendMessageResult = { success: true; messageId: string } | { success: false; error: string }

export type CreateChatResult = { success: true; chatId: string } | { success: false; error: string }
