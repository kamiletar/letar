/**
 * Barrel file для экспорта Server Actions работы с чатами
 *
 * ВАЖНО: Этот файл НЕ должен иметь 'use server' директиву,
 * так как он только реэкспортирует функции из других файлов,
 * которые уже имеют свои 'use server' директивы.
 *
 * @module chat
 *
 * Структура модуля:
 * - chat.types.ts — типы данных
 * - chat-queries.action.ts — получение чатов и контактов
 * - chat-messages.action.ts — отправка/редактирование/удаление сообщений
 * - chat-management.action.ts — создание чатов, настройки, участники
 *
 * @example
 * ```ts
 * import {
 *   getChatsAction,
 *   sendMessageAction,
 *   type GetChatsResult,
 * } from '../_actions/chat.action'
 * ```
 */

// === Типы ===
export type {
  ChatActionResult,
  CreateChatResult,
  GetChatResult,
  GetChatsResult,
  GetContactsResult,
  GetMessagesResult,
  SendMessageResult,
} from './chat.types'

// === Queries (получение данных) ===
export { getChatAction, getChatsAction, getContactsAction } from './chat-queries.action'

// === Сообщения ===
export { deleteMessageAction, editMessageAction, sendMessageAction, toggleReactionAction } from './chat-messages.action'

// === Управление чатами ===
export {
  addStudentToInstructorChatAction,
  createPrivateChatAction,
  getOrCreateInstructorStudentsChatAction,
  getOrCreatePrivateChatAction,
  getOrCreateSchoolChatAction,
  getOrCreateStudyGroupChatAction,
  getOrCreateSystemChatAction,
  markAsReadAction,
  markChatAsReadAction,
  removeStudentFromInstructorChatAction,
  updateChatSettingsAction,
} from './chat-management.action'
