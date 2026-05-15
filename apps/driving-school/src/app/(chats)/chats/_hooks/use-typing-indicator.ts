'use client'

import { useCallback, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { useDebouncedCallback } from 'use-debounce'

import { useSocketEvent } from './use-socket-event'

interface TypingUser {
  userId: string
  userName: string
}

interface UseTypingIndicatorProps {
  socket: Socket | null
  chatId: string
  currentUserId: string
}

/**
 * Хук для управления индикатором печати в чате.
 * Использует useSocketEvent для единообразной обработки событий.
 */
export function useTypingIndicator({ socket, chatId, currentUserId }: UseTypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  // Обработчик: кто-то начал печатать
  useSocketEvent<TypingUser>(
    socket,
    'user_typing',
    ({ userId, userName }) => {
      // Не добавляем текущего пользователя
      if (userId === currentUserId) {
        return
      }

      setTypingUsers((prev) => {
        // Проверяем, не добавлен ли уже этот пользователь
        if (prev.some((u) => u.userId === userId)) {
          return prev
        }
        return [...prev, { userId, userName }]
      })

      // Автоматически удаляем через 5 секунд
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== userId))
      }, 5000)
    },
    [currentUserId]
  )

  // Обработчик: кто-то перестал печатать
  useSocketEvent<{ userId: string }>(
    socket,
    'user_stopped_typing',
    ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId))
    },
    []
  )

  // Debounced функция для уведомления о печати (300ms)
  const notifyTyping = useDebouncedCallback(() => {
    if (!socket) {
      return
    }
    socket.emit('typing', { chatId })
  }, 300)

  // Функция для уведомления о прекращении печати
  const stopTyping = useCallback(() => {
    if (!socket) {
      return
    }
    socket.emit('stop_typing', { chatId })
  }, [socket, chatId])

  return { typingUsers, notifyTyping, stopTyping }
}
