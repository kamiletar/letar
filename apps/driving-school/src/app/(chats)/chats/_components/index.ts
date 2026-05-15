export { ChatHeader } from './chat-header'
export { ChatList } from './chat-list'
export { ChatMessages } from './chat-messages'
export { SendMessageForm } from './send-message-form'

// Диалоги не экспортируем - они импортируются динамически через next/dynamic
// для code splitting: DeleteMessageDialog, EditMessageDialog, NewChatDialog, ChatParticipantsModal
