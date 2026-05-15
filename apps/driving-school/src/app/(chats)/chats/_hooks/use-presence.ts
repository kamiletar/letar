'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Socket } from 'socket.io-client'

import { useSocketEvent } from './use-socket-event'

interface UsePresenceProps {
  socket: Socket | null
  initialUserIds?: string[] // Пользователи, статус которых нам интересен сразу
}

/**
 * Хук для отслеживания онлайн-статуса пользователей.
 * Использует useSocketEvent для единообразной обработки событий.
 */
export function usePresence({ socket, initialUserIds = [] }: UsePresenceProps) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  // Мемоизация массива для стабильной ссылки
  const stableUserIds = useMemo(
    () => initialUserIds,
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- Глубокое сравнение массива
    [JSON.stringify(initialUserIds)]
  )

  // Запрос статуса для конкретных пользователей
  const checkStatus = useCallback(
    (userIds: string[]) => {
      if (socket && userIds.length > 0) {
        socket.emit('get_users_status', userIds)
      }
    },
    [socket]
  )

  // Обработчик входа пользователя в сеть
  useSocketEvent<{ userId: string }>(
    socket,
    'user_online',
    ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]))
    },
    []
  )

  // Обработчик выхода пользователя из сети
  useSocketEvent<{ userId: string }>(
    socket,
    'user_offline',
    ({ userId }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    },
    []
  )

  // Обработчик получения списка онлайн пользователей (bulk response)
  // ВАЖНО: Заменяем Set полностью, чтобы избежать утечки памяти
  // (ранее добавляли к существующему Set, не удаляя офлайн пользователей)
  useSocketEvent<string[]>(
    socket,
    'users_status',
    (userIds) => {
      setOnlineUsers(new Set(userIds))
    },
    []
  )

  // Запрашиваем статус при изменении начального списка
  useEffect(() => {
    if (socket && stableUserIds.length > 0) {
      socket.emit('get_users_status', stableUserIds)
    }
  }, [socket, stableUserIds])

  // Вспомогательная функция для проверки
  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.has(userId)
    },
    [onlineUsers]
  )

  return { onlineUsers, isUserOnline, checkStatus }
}
