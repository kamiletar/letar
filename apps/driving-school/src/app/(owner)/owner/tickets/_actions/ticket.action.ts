'use server'

import { revalidatePath } from 'next/cache'

import { requireOwner } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { isOwner } from '@/lib/roles'

import type { TicketCategory, TicketStatus } from '@letar/driving-school-db/prisma'

import {
  type AssignTicketData,
  AssignTicketSchema,
  type ReplyToTicketData,
  ReplyToTicketSchema,
  type UpdateTicketStatusData,
  UpdateTicketStatusSchema,
} from '../_schemas/ticket.schema'

// ============================================================================
// ТИПЫ
// ============================================================================

export interface TicketWithAuthor {
  id: string
  category: TicketCategory
  subject: string
  description: string
  status: TicketStatus
  author: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  assignedTo: {
    id: string
    name: string | null
  } | null
  _count: {
    messages: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface TicketDetails extends TicketWithAuthor {
  messages: Array<{
    id: string
    content: string
    isFromSupport: boolean
    author: {
      id: string
      name: string | null
      image: string | null
    }
    createdAt: Date
  }>
  resolvedAt: Date | null
  closedAt: Date | null
}

export interface GetTicketsFilters {
  status?: TicketStatus | 'all'
  category?: TicketCategory | 'all'
  search?: string
}

export type GetTicketsResult =
  | { success: true; tickets: TicketWithAuthor[]; totalCount: number }
  | { success: false; error: string }

export type GetTicketDetailsResult = { success: true; ticket: TicketDetails } | { success: false; error: string }

export type TicketActionResult = { success: true } | { success: false; error: string }

// ============================================================================
// ПОЛУЧЕНИЕ СПИСКА ТИКЕТОВ
// ============================================================================

export async function getTicketsListAction(filters: GetTicketsFilters = {}): Promise<GetTicketsResult> {
  try {
    const authResult = await requireOwner()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.1 баг: select/include с relations генерирует невалидный SQL
    // Используем prisma напрямую для запросов с relations

    // Строим условия фильтрации
    const where: {
      status?: TicketStatus
      category?: TicketCategory
      OR?: Array<{
        subject?: { contains: string; mode: 'insensitive' }
        description?: { contains: string; mode: 'insensitive' }
        author?: {
          OR: Array<
            { name: { contains: string; mode: 'insensitive' } } | { email: { contains: string; mode: 'insensitive' } }
          >
        }
      }>
    } = {}

    // Фильтр по статусу
    if (filters.status && filters.status !== 'all') {
      where.status = filters.status
    }

    // Фильтр по категории
    if (filters.category && filters.category !== 'all') {
      where.category = filters.category
    }

    // Поиск
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim()
      where.OR = [
        { subject: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        {
          author: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
      ]
    }

    const [tickets, totalCount] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        select: {
          id: true,
          category: true,
          subject: true,
          description: true,
          status: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { messages: true },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { status: 'asc' }, // Открытые и в работе сначала
          { updatedAt: 'desc' },
        ],
      }),
      prisma.supportTicket.count({ where }),
    ])

    // Cast для совместимости типов между ZenStack и Prisma
    return { success: true, tickets: tickets as unknown as TicketWithAuthor[], totalCount }
  } catch (error) {
    console.error('Ошибка получения списка тикетов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// ============================================================================
// ПОЛУЧЕНИЕ ДЕТАЛЕЙ ТИКЕТА
// ============================================================================

export async function getTicketDetailsAction(ticketId: string): Promise<GetTicketDetailsResult> {
  try {
    const authResult = await requireOwner()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.1 баг: include с relations генерирует невалидный SQL
    // Используем prisma напрямую

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { messages: true },
        },
      },
    })

    if (!ticket) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Cast для совместимости типов между ZenStack и Prisma
    return { success: true, ticket: ticket as unknown as TicketDetails }
  } catch (error) {
    console.error('Ошибка получения деталей тикета:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// ============================================================================
// СМЕНА СТАТУСА ТИКЕТА
// ============================================================================

export async function updateTicketStatusAction(data: UpdateTicketStatusData): Promise<TicketActionResult> {
  const parsed = UpdateTicketStatusSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const authResult = await requireOwner()
  if (!authResult.success) {
    return { success: false, error: 'Недостаточно прав' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { ticketId, status } = parsed.data

    // Проверяем тикет
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      return { success: false, error: 'Обращение не найдено' }
    }

    // Обновляем статус
    const updateData: {
      status: TicketStatus
      resolvedAt?: Date | null
      closedAt?: Date | null
    } = { status }

    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date()
    }
    if (status === 'CLOSED') {
      updateData.closedAt = new Date()
    }
    // Если меняем с RESOLVED или CLOSED на другой статус - очищаем даты
    if (status !== 'RESOLVED') {
      updateData.resolvedAt = null
    }
    if (status !== 'CLOSED') {
      updateData.closedAt = null
    }

    await db.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    })

    // Логируем действие
    const auditAction = status === 'RESOLVED' ? 'OWNER_TICKET_RESOLVE' : 'OWNER_TICKET_ASSIGN'
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: auditAction,
        entityType: 'SupportTicket',
        entityId: ticketId,
        payload: { oldStatus: ticket.status, newStatus: status },
      },
    })

    revalidatePath('/owner/tickets')
    revalidatePath(`/owner/tickets/${ticketId}`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка изменения статуса тикета:', error)
    return { success: false, error: 'Произошла ошибка при изменении статуса' }
  }
}

// ============================================================================
// НАЗНАЧЕНИЕ ТИКЕТА
// ============================================================================

export async function assignTicketAction(data: AssignTicketData): Promise<TicketActionResult> {
  const parsed = AssignTicketSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const authResult = await requireOwner()
  if (!authResult.success) {
    return { success: false, error: 'Недостаточно прав' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { ticketId, assignedToId } = parsed.data

    // Проверяем тикет
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      return { success: false, error: 'Обращение не найдено' }
    }

    // Проверяем пользователя, если назначаем
    if (assignedToId) {
      const targetUser = await db.user.findUnique({
        where: { id: assignedToId },
        select: { roles: true },
      })

      if (!targetUser || !isOwner(targetUser.roles)) {
        return { success: false, error: 'Можно назначить только владельцу' }
      }
    }

    // Назначаем тикет
    await db.supportTicket.update({
      where: { id: ticketId },
      data: { assignedToId: assignedToId || null },
    })

    // Логируем действие
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'OWNER_TICKET_ASSIGN',
        entityType: 'SupportTicket',
        entityId: ticketId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: { assignedToId } as any,
      },
    })

    revalidatePath('/owner/tickets')
    revalidatePath(`/owner/tickets/${ticketId}`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка назначения тикета:', error)
    return { success: false, error: 'Произошла ошибка при назначении' }
  }
}

// ============================================================================
// ОТВЕТ НА ТИКЕТ
// ============================================================================

export async function replyToTicketAction(data: ReplyToTicketData): Promise<TicketActionResult> {
  const parsed = ReplyToTicketSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Введите сообщение' }
  }

  const authResult = await requireOwner()
  if (!authResult.success) {
    return { success: false, error: 'Недостаточно прав' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { ticketId, message } = parsed.data

    // Проверяем тикет
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      return { success: false, error: 'Обращение не найдено' }
    }

    // Проверяем, что тикет не закрыт
    if (ticket.status === 'CLOSED') {
      return { success: false, error: 'Обращение закрыто, отправка сообщений невозможна' }
    }

    // Создаём сообщение от поддержки
    await db.supportMessage.create({
      data: {
        ticketId,
        authorId: user.id,
        content: message,
        isFromSupport: true,
      },
    })

    // Обновляем статус тикета на IN_PROGRESS, если был OPEN
    if (ticket.status === 'OPEN') {
      await db.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      })
    }

    revalidatePath('/owner/tickets')
    revalidatePath(`/owner/tickets/${ticketId}`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка отправки ответа:', error)
    return { success: false, error: 'Произошла ошибка при отправке ответа' }
  }
}
