/**
 * Экспорты сервисов чатов
 */

// Сервис бизнес-логики чатов
export {
  addStudentToInstructorChat,
  getChatDetails,
  getOrCreateInstructorStudentsChat,
  getOrCreatePlatformFeedbackChat,
  getOrCreatePlatformSupportChat,
  getOrCreatePrivateChat,
  getOrCreateSchoolChat,
  getOrCreateSchoolStudentChat,
  getOrCreateStudyGroupChat,
  getOrCreateSystemChat,
  getUserChats,
  getUserContacts,
  markChatAsRead,
  removeStudentFromInstructorChat,
  updateChatSettings,
} from './chat-service'
export type { ChatDetails, ChatMessage, ChatSummary, Contact } from './chat-service'

// Сервис операций с сообщениями
export { deleteMessage, editMessage, sendMessage, toggleReaction } from './message-service'
export type { SendMessageParams, SendMessageResult } from './message-service'

// Сервис уведомлений
export { notifyChatParticipants, notifyChatUpdateSSE } from './chat-notifications'
export type { NotifyChatParticipantsParams } from './chat-notifications'
