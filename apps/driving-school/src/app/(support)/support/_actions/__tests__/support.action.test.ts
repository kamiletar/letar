import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  closeTicketAction,
  createTicketAction,
  getAllTicketsAction,
  getMyTicketsAction,
  getTicketAction,
  resolveTicketAction,
  sendSupportMessageAction,
} from '../support.action'

// === Моки ===

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    supportTicket: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    supportMessage: {
      create: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/action-helpers', () => ({
  requireAuth: vi.fn(async () => ({
    success: true,
    user: { id: 'user-1', roles: ['USER'] },
  })),
  requireOwner: vi.fn(async () => ({
    success: true,
    user: { id: 'owner-1', roles: ['OWNER'] },
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  getEnhancedPrisma: vi.fn(() => mockPrisma),
}))

vi.mock('@/lib/roles', () => ({
  isOwner: vi.fn((roles: string[]) => roles?.includes('OWNER')),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('../../_schemas/support-ticket.schema', () => ({
  CreateTicketSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
  SendMessageSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
  CloseTicketSchema: {
    safeParse: vi.fn((data: unknown) => ({ success: true, data })),
  },
}))

// === Тесты ===

describe('support.action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTicketAction', () => {
    it('успешно создаёт тикет', async () => {
      mockPrisma.supportTicket.create.mockResolvedValue({
        id: 'ticket-1',
      })

      const result = await createTicketAction({
        category: 'BUG',
        subject: 'Ошибка в расписании',
        description: 'Описание проблемы длиннее 20 символов для валидации',
      } as never)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.ticketId).toBe('ticket-1')
      }
    })

    it('возвращает ошибку при невалидных данных', async () => {
      const { CreateTicketSchema } = await import('../../_schemas/support-ticket.schema')
      vi.mocked(CreateTicketSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: [] },
      } as never)

      const result = await createTicketAction({} as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Некорректные')
      }
    })

    it('возвращает ошибку при отсутствии авторизации', async () => {
      const { requireAuth } = await import('@/lib/action-helpers')
      vi.mocked(requireAuth).mockResolvedValueOnce({
        success: false,
        error: 'UNAUTHORIZED',
      })

      const result = await createTicketAction({} as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('войти')
      }
    })
  })

  describe('sendSupportMessageAction', () => {
    it('успешно отправляет сообщение автором тикета', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        authorId: 'user-1',
        status: 'OPEN',
      })
      mockPrisma.supportMessage.create.mockResolvedValue({})

      const result = await sendSupportMessageAction({
        ticketId: 'ticket-1',
        content: 'Дополнительная информация',
      } as never)

      expect(result.success).toBe(true)
    })

    it('возвращает ошибку если тикет не найден', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(null)

      const result = await sendSupportMessageAction({
        ticketId: 'nonexistent',
        content: 'Тест',
      } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не найдено')
      }
    })

    it('запрещает сообщение в закрытый тикет', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        authorId: 'user-1',
        status: 'CLOSED',
      })

      const result = await sendSupportMessageAction({
        ticketId: 'ticket-1',
        content: 'Тест',
      } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('закрыто')
      }
    })

    it('запрещает доступ чужому пользователю', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        authorId: 'other-user',
        status: 'OPEN',
      })

      const result = await sendSupportMessageAction({
        ticketId: 'ticket-1',
        content: 'Тест',
      } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('доступа')
      }
    })
  })

  describe('closeTicketAction', () => {
    it('успешно закрывает тикет автором', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        authorId: 'user-1',
        status: 'OPEN',
      })
      mockPrisma.supportTicket.update.mockResolvedValue({})

      const result = await closeTicketAction({ ticketId: 'ticket-1' } as never)

      expect(result.success).toBe(true)
      expect(mockPrisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CLOSED' }),
        })
      )
    })

    it('возвращает ошибку если тикет не найден', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(null)

      const result = await closeTicketAction({ ticketId: 'nonexistent' } as never)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('не найдено')
      }
    })
  })

  describe('getMyTicketsAction', () => {
    it('возвращает тикеты пользователя', async () => {
      mockPrisma.supportTicket.findMany.mockResolvedValue([
        {
          id: 't1',
          category: 'BUG',
          subject: 'Баг',
          status: 'OPEN',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { messages: 2 },
        },
      ])

      const result = await getMyTicketsAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.tickets).toHaveLength(1)
        expect(result.tickets[0].subject).toBe('Баг')
      }
    })

    it('возвращает ошибку при отсутствии авторизации', async () => {
      const { requireAuth } = await import('@/lib/action-helpers')
      vi.mocked(requireAuth).mockResolvedValueOnce({
        success: false,
        error: 'UNAUTHORIZED',
      })

      const result = await getMyTicketsAction()

      expect(result.success).toBe(false)
    })
  })

  describe('getTicketAction', () => {
    it('возвращает тикет с сообщениями для автора', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        authorId: 'user-1',
        category: 'HELP',
        subject: 'Помогите',
        status: 'OPEN',
        author: { id: 'user-1', name: 'Пользователь', image: null, roles: ['USER'] },
        messages: [
          {
            id: 'm1',
            content: 'Текст',
            isFromSupport: false,
            author: { id: 'user-1', name: 'Пользователь', image: null },
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: null,
        closedAt: null,
      })

      const result = await getTicketAction('ticket-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.ticket.subject).toBe('Помогите')
        expect(result.ticket.messages).toHaveLength(1)
      }
    })

    it('возвращает NOT_FOUND если тикет не найден', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue(null)

      const result = await getTicketAction('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('getAllTicketsAction', () => {
    it('возвращает все тикеты для владельца', async () => {
      mockPrisma.supportTicket.findMany.mockResolvedValue([
        {
          id: 't1',
          category: 'BUG',
          subject: 'Баг 1',
          status: 'OPEN',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { messages: 1 },
        },
        {
          id: 't2',
          category: 'HELP',
          subject: 'Помощь',
          status: 'CLOSED',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { messages: 3 },
        },
      ])

      const result = await getAllTicketsAction()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.tickets).toHaveLength(2)
      }
    })

    it('возвращает ошибку для не-владельца', async () => {
      const { requireOwner } = await import('@/lib/action-helpers')
      vi.mocked(requireOwner).mockResolvedValueOnce({
        success: false,
        error: 'UNAUTHORIZED',
      })

      const result = await getAllTicketsAction()

      expect(result.success).toBe(false)
    })
  })

  describe('resolveTicketAction', () => {
    it('успешно помечает тикет как решённый', async () => {
      mockPrisma.supportTicket.update.mockResolvedValue({})

      const result = await resolveTicketAction({ ticketId: 'ticket-1' } as never)

      expect(result.success).toBe(true)
      expect(mockPrisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RESOLVED' }),
        })
      )
    })

    it('возвращает ошибку для не-владельца', async () => {
      const { requireOwner } = await import('@/lib/action-helpers')
      vi.mocked(requireOwner).mockResolvedValueOnce({
        success: false,
        error: 'UNAUTHORIZED',
      })

      const result = await resolveTicketAction({ ticketId: 'ticket-1' } as never)

      expect(result.success).toBe(false)
    })
  })
})
