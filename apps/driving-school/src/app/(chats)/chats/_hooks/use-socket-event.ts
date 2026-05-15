'use client'

import type { DependencyList } from 'react'
import { useCallback, useEffect } from 'react'
import type { Socket } from 'socket.io-client'

/**
 * Generic хук для подписки на socket события.
 * Упрощает работу с Socket.IO event listeners, обеспечивая:
 * - Автоматическую подписку/отписку при изменении зависимостей
 * - Безопасную обработку null socket
 * - Правильную очистку при unmount
 *
 * @param socket - Socket.IO соединение (может быть null)
 * @param eventName - Имя события для подписки
 * @param handler - Обработчик события
 * @param dependencies - Дополнительные зависимости для перезаписки
 *
 * @example
 * ```tsx
 * useSocketEvent(socket, 'user_online', ({ userId }) => {
 *   setOnlineUsers(prev => new Set([...prev, userId]))
 * })
 *
 * // С зависимостями:
 * useSocketEvent(socket, 'new_message', handleMessage, [chatId])
 * ```
 */
export function useSocketEvent<T = unknown>(
  socket: Socket | null,
  eventName: string,
  handler: (data: T) => void,
  dependencies: DependencyList = []
) {
  // Мемоизируем handler для предотвращения лишних переподписок
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- dependencies переданы явно
  const stableHandler = useCallback(handler, dependencies)

  useEffect(() => {
    if (!socket) {
      return
    }

    socket.on(eventName, stableHandler)

    return () => {
      socket.off(eventName, stableHandler)
    }
  }, [socket, eventName, stableHandler])
}

/**
 * Подписка на несколько socket событий одним хуком.
 * Полезно когда нужно обработать группу связанных событий.
 *
 * @example
 * ```tsx
 * useSocketEvents(socket, {
 *   'user_online': handleUserOnline,
 *   'user_offline': handleUserOffline,
 * })
 * ```
 */
export function useSocketEvents<TEvents extends Record<string, (data: unknown) => void>>(
  socket: Socket | null,
  events: TEvents
) {
  useEffect(() => {
    if (!socket) {
      return
    }

    // Подписываемся на все события
    const entries = Object.entries(events)
    for (const [eventName, handler] of entries) {
      socket.on(eventName, handler)
    }

    // Отписываемся при cleanup
    return () => {
      for (const [eventName, handler] of entries) {
        socket.off(eventName, handler)
      }
    }
  }, [socket, events])
}
