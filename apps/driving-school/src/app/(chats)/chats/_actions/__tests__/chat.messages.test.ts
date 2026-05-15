import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteMessageAction,
  editMessageAction,
  sendMessageAction,
  toggleReactionAction,
} from '../chat-messages.action'

// === Моки ===

const { mockSendMessage, mockEditMessage, mockDeleteMessage, mockToggleReaction } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  mockEditMessage: vi.fn(),
  mockDeleteMessage: vi.fn(),
  mockToggleReaction: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => ({
    session: { id: 'session-1' },
    user: { id: 'user-1', roles: ['USER'] },
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: {},
  getEnhancedPrisma: vi.fn(() => ({})),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('../../_services/message-service', () => ({
  sendMessage: mockSendMessage,
  editMessage: mockEditMessage,
  deleteMessage: mockDeleteMessage,
  toggleReaction: mockToggleReaction,
}))

vi.mock('../../_services', () => ({
  notifyChatParticipants: vi.fn(async () => undefined),
  notifyChatUpdateSSE: vi.fn(),
}))

vi.mock('../../_schemas/chat.schema', () => ({
  SendMessageSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
  EditMessageSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
  DeleteMessageSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
  ToggleReactionSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
}))

// === Тесты ===

describe('chat-messages.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessageAction', () => {
    it('успешно отправляет сообщение', async () => {
      mockSendMessage.mockResolvedValue({
        messageId: 'msg-1',
        authorName: 'Тест',
        chatInfo: {
          name: 'Чат',
          type: 'DIRECT',
          participantIds: ['user-1', 'user-2'],
        },
      })

      const result = await sendMessageAction({
        chatId: 'chat-1',
        content: 'Привет!',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.messageId).toBe('msg-1')
      }
    })

    it('возвращает ошибку если нет сессии', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValueOnce(null)

      const result = await sendMessageAction({
        chatId: 'chat-1',
        content: 'Привет!',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('войти')
      }
    })

    it('обрабатывает FORBIDDEN из сервиса', async () => {
      mockSendMessage.mockRejectedValue(new Error('FORBIDDEN'))

      const result = await sendMessageAction({
        chatId: 'chat-1',
        content: 'Привет!',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('доступа')
      }
    })

    it('возвращает ошибку при невалидных данных', async () => {
      const { SendMessageSchema } = await import('../../_schemas/chat.schema')
      vi.mocked(SendMessageSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [] },
      } as never)

      const result = await sendMessageAction({} as never)

      expect(result.success).toBe(false)
    })
  })

  describe('editMessageAction', () => {
    it('успешно редактирует сообщение', async () => {
      mockEditMessage.mockResolvedValue('chat-1')

      const result = await editMessageAction({
        messageId: 'msg-1',
        content: 'Обновлено',
      })

      expect(result.success).toBe(true)
    })

    it('обрабатывает NOT_FOUND', async () => {
      mockEditMessage.mockRejectedValue(new Error('NOT_FOUND'))

      const result = await editMessageAction({
        messageId: 'nonexistent',
        content: 'Тест',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не найдено')
      }
    })

    it('обрабатывает FORBIDDEN', async () => {
      mockEditMessage.mockRejectedValue(new Error('FORBIDDEN'))

      const result = await editMessageAction({
        messageId: 'msg-1',
        content: 'Тест',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('свои сообщения')
      }
    })
  })

  describe('deleteMessageAction', () => {
    it('успешно удаляет сообщение', async () => {
      mockDeleteMessage.mockResolvedValue('chat-1')

      const result = await deleteMessageAction({ messageId: 'msg-1' })

      expect(result.success).toBe(true)
    })

    it('обрабатывает NOT_FOUND', async () => {
      mockDeleteMessage.mockRejectedValue(new Error('NOT_FOUND'))

      const result = await deleteMessageAction({ messageId: 'nonexistent' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не найдено')
      }
    })
  })

  describe('toggleReactionAction', () => {
    it('успешно переключает реакцию', async () => {
      mockToggleReaction.mockResolvedValue('chat-1')

      const result = await toggleReactionAction({
        messageId: 'msg-1',
        emoji: '👍',
      })

      expect(result.success).toBe(true)
    })

    it('обрабатывает FORBIDDEN', async () => {
      mockToggleReaction.mockRejectedValue(new Error('FORBIDDEN'))

      const result = await toggleReactionAction({
        messageId: 'msg-1',
        emoji: '👍',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('доступа')
      }
    })
  })
})
