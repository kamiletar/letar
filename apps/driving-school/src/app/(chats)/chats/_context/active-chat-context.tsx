'use client'

/**
 * Контекст активного чата для сплитскрин-панели
 *
 * Позволяет передавать информацию о текущем чате из страницы [id] в layout
 * для отображения контекстной панели.
 */

import type { ChatType } from '@letar/driving-school-db/prisma'
import { createContext, useContext, useMemo, useState } from 'react'

interface ActiveChatData {
  chatId: string
  chatType: ChatType
  /** Для приватных чатов — ID собеседника */
  otherParticipantId?: string
  /** Для STUDY_GROUP чатов */
  studyGroupId?: string
  /** Для SCHOOL чатов */
  organizationId?: string
  /** Для INSTRUCTOR_STUDENTS чатов */
  instructorId?: string
  /** Участники чата */
  participants?: Array<{
    userId: string
    user: {
      id: string
      name: string | null
      image: string | null
    }
  }>
}

interface ActiveChatContextValue {
  activeChat: ActiveChatData | null
  setActiveChat: (chat: ActiveChatData | null) => void
}

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null)

interface ActiveChatProviderProps {
  children: React.ReactNode
}

export function ActiveChatProvider({ children }: ActiveChatProviderProps) {
  const [activeChat, setActiveChat] = useState<ActiveChatData | null>(null)

  const value = useMemo(() => ({ activeChat, setActiveChat }), [activeChat])

  return <ActiveChatContext.Provider value={value}>{children}</ActiveChatContext.Provider>
}

export function useActiveChat() {
  const context = useContext(ActiveChatContext)

  if (!context) {
    throw new Error('useActiveChat must be used within ActiveChatProvider')
  }

  return context
}

/**
 * Хук для безопасного доступа к контексту (возвращает null если провайдер не найден)
 */
export function useActiveChatSafe() {
  return useContext(ActiveChatContext)
}
