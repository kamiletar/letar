'use client'

import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import type { ChatMessage } from '../_services'

interface UseChatSocketProps {
  socket: Socket | null
  chatId: string
  userId: string
  initialMessages: ChatMessage[]
}

/**
 * Максимальное количество сообщений в памяти
 * Предотвращает утечку памяти при долгом использовании чата
 */
const MAX_MESSAGES = 200

/**
 * Хук для управления сообщениями чата через WebSocket
 */
export function useChatSocket({ socket, chatId, userId, initialMessages }: UseChatSocketProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)

  useEffect(() => {
    if (!socket) {
      return
    }

    // Присоединяемся к чату при монтировании
    socket.emit('join_chat', { chatId, userId })

    // Подписываемся на новые сообщения
    // Ограничиваем количество сообщений для предотвращения утечки памяти
    const handleNewMessage = (message: ChatMessage) => {
      setMessages((prev) => {
        const updated = [...prev, message]
        // Оставляем только последние MAX_MESSAGES сообщений
        return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated
      })
    }

    // Подписываемся на обновления сообщений
    const handleMessageUpdated = (updatedMessage: ChatMessage) => {
      setMessages((prev) => prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg)))
    }

    socket.on('new_message', handleNewMessage)
    socket.on('message_updated', handleMessageUpdated)

    // Cleanup при unmount
    return () => {
      socket.emit('leave_chat', { chatId })
      socket.off('new_message', handleNewMessage)
      socket.off('message_updated', handleMessageUpdated)
    }
  }, [socket, chatId, userId])

  /**
   * Отправить сообщение в чат
   */
  const sendMessage = (content: string, replyToId?: string) => {
    if (!socket) {
      return
    }

    socket.emit('send_message', {
      chatId,
      content,
      replyToId,
    })
  }

  /**
   * Редактировать сообщение через сокет
   */
  const editMessage = (messageId: string, content: string) => {
    if (!socket) {
      return
    }

    socket.emit('edit_message', {
      chatId,
      messageId,
      content,
    })
  }

  return { messages, sendMessage, editMessage }
}
