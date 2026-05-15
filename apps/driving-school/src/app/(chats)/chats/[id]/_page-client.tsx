'use client'

import { Spinner, VStack } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState, useTransition } from 'react'

import {
  deleteMessageAction,
  editMessageAction,
  toggleReactionAction,
  updateChatSettingsAction,
} from '../_actions/chat.action'
import { ChatHeader, ChatMessages, SendMessageForm } from '../_components'
import { useActiveChatSafe } from '../_context/active-chat-context'
import { useChatSocket } from '../_hooks/use-chat-socket'
import { usePresence } from '../_hooks/use-presence'
import { useSocket } from '../_hooks/use-socket'
import { useTypingIndicator } from '../_hooks/use-typing-indicator'
import type { ChatDetails, ChatMessage } from '../_services'

// Динамический импорт диалогов для code splitting
const EditMessageDialog = dynamic(() => import('../_components/edit-message-dialog').then((m) => m.EditMessageDialog), {
  ssr: false,
  loading: () => <Spinner size="sm" />,
})

const DeleteMessageDialog = dynamic(
  () => import('../_components/delete-message-dialog').then((m) => m.DeleteMessageDialog),
  {
    ssr: false,
    loading: () => <Spinner size="sm" />,
  }
)

interface ChatPageClientProps {
  chat: ChatDetails
  currentUserId: string
  currentUserName: string
}

export function ChatPageClient({ chat, currentUserId, currentUserName: _currentUserName }: ChatPageClientProps) {
  // Контекст для сплитскрин-панели
  const activeChatContext = useActiveChatSafe()

  // WebSocket хуки
  const { socket, isConnected } = useSocket()
  const {
    messages,
    sendMessage,
    editMessage: editMessageSocket,
  } = useChatSocket({
    socket,
    chatId: chat.id,
    userId: currentUserId,
    initialMessages: chat.messages,
  })
  const { typingUsers, notifyTyping, stopTyping } = useTypingIndicator({
    socket,
    chatId: chat.id,
    currentUserId,
  })

  // Определяем ID собеседника для приватных чатов
  const otherParticipantId = useMemo(() => {
    if (chat.type !== 'PRIVATE') {
      return undefined
    }
    return chat.participants.find((p) => p.userId !== currentUserId)?.userId
  }, [chat.type, chat.participants, currentUserId])

  // Устанавливаем активный чат в контекст для сплитскрин-панели
  useEffect(() => {
    if (activeChatContext) {
      // Определяем instructorId для чатов INSTRUCTOR_STUDENTS
      // Инструктор — это тот, у кого isAdmin=true в таком чате
      const instructorParticipant =
        chat.type === 'INSTRUCTOR_STUDENTS' ? chat.participants.find((p) => p.isAdmin) : undefined

      activeChatContext.setActiveChat({
        chatId: chat.id,
        chatType: chat.type,
        otherParticipantId,
        // Для STUDY_GROUP чатов можно извлечь studyGroupId из chat если он есть
        // studyGroupId: chat.studyGroupId,
        // organizationId: chat.organizationId,
        instructorId: instructorParticipant?.userId,
        participants: chat.participants.map((p) => ({
          userId: p.userId,
          user: p.user,
        })),
      })
    }

    // Очищаем при размонтировании
    return () => {
      if (activeChatContext) {
        activeChatContext.setActiveChat(null)
      }
    }
  }, [chat.id, chat.type, chat.participants, otherParticipantId, activeChatContext])

  const { isUserOnline } = usePresence({
    socket,
    initialUserIds: otherParticipantId ? [otherParticipantId] : [],
  })

  const [replyTo, setReplyTo] = useState<{
    id: string
    content: string
    authorName: string
  } | null>(null)

  // Состояние диалогов
  const [editDialogMessage, setEditDialogMessage] = useState<ChatMessage | null>(null)
  const [deleteDialogMessageId, setDeleteDialogMessageId] = useState<string | null>(null)

  // Действия с сообщениями
  const [isEditPending, startEditTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()
  const [, startReactionTransition] = useTransition()
  const [, startSettingsTransition] = useTransition()

  // Находим последнее сообщение текущего пользователя (для редактирования по клавише вверх)
  const lastOwnMessage = useMemo(() => {
    return [...messages].reverse().find((m) => m.author.id === currentUserId)
  }, [messages, currentUserId])

  // Обработчик ответа на сообщение
  const handleReply = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId)
    if (message) {
      setReplyTo({
        id: message.id,
        content: message.content,
        authorName: message.author.name || 'Пользователь',
      })
    }
  }

  // Обработчик редактирования — открывает диалог
  const handleEdit = (message: ChatMessage) => {
    setEditDialogMessage(message)
  }

  // Обработчик удаления — открывает диалог подтверждения
  const handleDelete = (messageId: string) => {
    setDeleteDialogMessageId(messageId)
  }

  // Сохранение редактирования
  const handleSaveEdit = (messageId: string, newContent: string) => {
    if (isConnected) {
      editMessageSocket(messageId, newContent)
      setEditDialogMessage(null)
    } else {
      startEditTransition(async () => {
        await editMessageAction({ messageId, content: newContent })
        setEditDialogMessage(null)
      })
    }
  }

  // Подтверждение удаления
  const handleConfirmDelete = (messageId: string) => {
    startDeleteTransition(async () => {
      await deleteMessageAction({ messageId })
      setDeleteDialogMessageId(null)
    })
  }

  // Редактирование последнего сообщения по клавише вверх
  const handleEditLastMessage = () => {
    if (lastOwnMessage) {
      setEditDialogMessage(lastOwnMessage)
    }
  }

  // Обработчик реакции
  const handleReaction = (messageId: string, emoji: string) => {
    startReactionTransition(async () => {
      await toggleReactionAction({ messageId, emoji })
    })
  }

  // Обработчик mute
  const handleToggleMute = () => {
    startSettingsTransition(async () => {
      await updateChatSettingsAction({ chatId: chat.id, isMuted: !chat.isMuted })
    })
  }

  return (
    <VStack h="full" gap={0} w={'full'} alignItems={'stretch'}>
      {/* Заголовок */}
      <ChatHeader
        chat={chat}
        currentUserId={currentUserId}
        onToggleMute={handleToggleMute}
        isOtherUserOnline={otherParticipantId ? isUserOnline(otherParticipantId) : undefined}
      />
      {/* Сообщения */}
      <ChatMessages
        chat={{ ...chat, messages }}
        currentUserId={currentUserId}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReaction={handleReaction}
        typingUsers={typingUsers}
      />
      {/* Форма отправки */}
      <SendMessageForm
        chatId={chat.id}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onEditLastMessage={handleEditLastMessage}
        onSendMessage={sendMessage}
        onTyping={notifyTyping}
        onStopTyping={stopTyping}
      />
      {/* Диалог редактирования */}
      <EditMessageDialog
        isOpen={!!editDialogMessage}
        onClose={() => setEditDialogMessage(null)}
        message={editDialogMessage}
        onSave={handleSaveEdit}
        isPending={isEditPending}
      />
      {/* Диалог подтверждения удаления */}
      <DeleteMessageDialog
        isOpen={!!deleteDialogMessageId}
        onClose={() => setDeleteDialogMessageId(null)}
        messageId={deleteDialogMessageId}
        onConfirm={handleConfirmDelete}
        isPending={isDeletePending}
      />
    </VStack>
  )
}
