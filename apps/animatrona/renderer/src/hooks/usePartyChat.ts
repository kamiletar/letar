/**
 * usePartyChat — React хук для чата Watch Party
 *
 * Предоставляет реактивный доступ к сообщениям и реакциям чата.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { WatchPartyChatMessage } from '../../../shared/types/orbitdb'

/** Доступные реакции */
export const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👏'] as const

export type Reaction = (typeof REACTIONS)[number]

export interface UsePartyChatReturn {
  /** Сообщения чата */
  messages: WatchPartyChatMessage[]
  /** Отправить текстовое сообщение */
  sendMessage: (text: string) => Promise<boolean>
  /** Отправить реакцию */
  sendReaction: (reaction: Reaction) => Promise<boolean>
  /** Очистить локальный чат */
  clearMessages: () => void
  /** Ref для автоскролла */
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  /** Количество непрочитанных сообщений */
  unreadCount: number
  /** Сбросить счётчик непрочитанных */
  markAsRead: () => void
}

export function usePartyChat(): UsePartyChatReturn {
  const [messages, setMessages] = useState<WatchPartyChatMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isVisibleRef = useRef(true)

  // Отправить текстовое сообщение
  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!window.electronAPI?.watchParty) {
      return false
    }

    const trimmed = text.trim()
    if (!trimmed) {
      return false
    }

    try {
      const result = await window.electronAPI.watchParty.sendMessage(trimmed)
      return result.success
    } catch {
      return false
    }
  }, [])

  // Отправить реакцию
  const sendReaction = useCallback(async (reaction: Reaction): Promise<boolean> => {
    if (!window.electronAPI?.watchParty) {
      return false
    }

    try {
      const result = await window.electronAPI.watchParty.sendReaction(reaction)
      return result.success
    } catch {
      return false
    }
  }, [])

  // Очистить сообщения
  const clearMessages = useCallback(() => {
    setMessages([])
    setUnreadCount(0)
  }, [])

  // Сбросить непрочитанные
  const markAsRead = useCallback(() => {
    setUnreadCount(0)
    isVisibleRef.current = true
  }, [])

  // Подписка на сообщения
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    if (window.electronAPI?.watchParty) {
      unsubscribe = window.electronAPI.watchParty.onMessageReceived(({ message }) => {
        setMessages((prev) => {
          // Избегаем дубликатов
          if (prev.some((m) => m.id === message.id)) {
            return prev
          }
          return [...prev, message]
        })

        // Увеличиваем счётчик непрочитанных если чат не видим
        if (!isVisibleRef.current) {
          setUnreadCount((prev) => prev + 1)
        }

        // Автоскролл к последнему сообщению
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      })
    }

    // Слежение за видимостью
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isVisibleRef.current = true
        setUnreadCount(0)
      } else {
        isVisibleRef.current = false
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      unsubscribe?.()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Подписка на закрытие комнаты — очистить чат
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    if (window.electronAPI?.watchParty) {
      unsubscribe = window.electronAPI.watchParty.onRoomClosed(() => {
        setMessages([])
        setUnreadCount(0)
      })
    }

    return () => {
      unsubscribe?.()
    }
  }, [])

  return {
    messages,
    sendMessage,
    sendReaction,
    clearMessages,
    messagesEndRef,
    unreadCount,
    markAsRead,
  }
}
