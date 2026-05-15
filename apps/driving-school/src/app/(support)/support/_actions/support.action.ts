'use server'

import { revalidatePath } from 'next/cache'

import { requireAuth, requireOwner } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { isOwner } from '@/lib/roles'

import type { TicketCategory, TicketStatus } from '@letar/driving-school-db/prisma'

import {
  type CloseTicketData,
  CloseTicketSchema,
  type CreateTicketData,
  CreateTicketSchema,
  type SendMessageData,
  SendMessageSchema,
} from '../_schemas/support-ticket.schema'

// ============================================================================
// ТИПЫ
// ============================================================================

export interface TicketWithMessages {
  id: string
  category: TicketCategory
  subject: string
  description: string
  status: TicketStatus
  author: {
    id: string
    name: string | null
    image: string | null
    roles: ('USER' | 'FREELANCE_INSTRUCTOR' | 'MODERATOR' | 'OWNER')[]
  }
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
  createdAt: Date
  updatedAt: Date
  resolvedAt: Date | null
  closedAt: Date | null
}

export interface TicketSummary {
  id: string
  category: TicketCategory
  subject: string
  status: TicketStatus
  createdAt: Date
  updatedAt: Date
  _count: {
    messages: number
  }
}

export type GetTicketsResult = { success: true; tickets: TicketSummary[] } | { success: false; error: string }

export type GetTicketResult = { success: true; ticket: TicketWithMessages } | { success: false; error: string }

export type SupportActionResult = { success: true; ticketId?: string } | { success: false; error: string }

// ============================================================================
// СОЗДАНИЕ ТИКЕТА
// ============================================================================

export async function createTicketAction(data: CreateTicketData): Promise<SupportActionResult> {
  const parsed = CreateTicketSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { category, subject, description } = parsed.data

    const ticket = await db.supportTicket.create({
      data: {
        authorId: user.id,
        category,
        subject,
        description,
      },
    })

    return { success: true, ticketId: ticket.id }
  } catch (error) {
    console.error('Ошибка создания тикета:', error)
    return { success: false, error: 'Произошла ошибка при создании обращения' }
  }
}

// ============================================================================
// ОТПРАВКА СООБЩЕНИЯ
// ============================================================================

export async function sendSupportMessageAction(data: SendMessageData): Promise<SupportActionResult> {
  const parsed = SendMessageSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Введите сообщение' }
  }

  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { ticketId, content } = parsed.data

    // Проверяем тикет
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      return { success: false, error: 'Обращение не найдено' }
    }

    // Проверяем права доступа
    const isAuthor = ticket.authorId === user.id
    const isAdmin = isOwner(user.roles) // Только владелец может работать с поддержкой

    if (!isAuthor && !isAdmin) {
      return { success: false, error: 'У вас нет доступа к этому обращению' }
    }

    // Проверяем, что тикет не закрыт
    if (ticket.status === 'CLOSED') {
      return { success: false, error: 'Обращение закрыто, отправка сообщений невозможна' }
    }

    // Создаём сообщение
    await db.supportMessage.create({
      data: {
        ticketId,
        authorId: user.id,
        content,
        isFromSupport: isAdmin && !isAuthor, // От поддержки, если админ и не автор тикета
      },
    })

    // Обновляем статус тикета, если отвечает поддержка
    if (isAdmin && !isAuthor && ticket.status === 'OPEN') {
      await db.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      })
    }

    revalidatePath(`/support/${ticketId}`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error)
    return { success: false, error: 'Произошла ошибка при отправке сообщения' }
  }
}

// ============================================================================
// ЗАКРЫТИЕ ТИКЕТА
// ============================================================================

export async function closeTicketAction(data: CloseTicketData): Promise<SupportActionResult> {
  const parsed = CloseTicketSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'ID тикета обязателен' }
  }

  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { ticketId } = parsed.data

    // Проверяем тикет
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      return { success: false, error: 'Обращение не найдено' }
    }

    // Проверяем права доступа
    const isAuthor = ticket.authorId === user.id
    const isAdmin = isOwner(user.roles)

    if (!isAuthor && !isAdmin) {
      return { success: false, error: 'У вас нет доступа к этому обращению' }
    }

    // Закрываем тикет
    await db.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    })

    revalidatePath(`/support/${ticketId}`)
    revalidatePath('/support')
    return { success: true }
  } catch (error) {
    console.error('Ошибка закрытия тикета:', error)
    return { success: false, error: 'Произошла ошибка при закрытии обращения' }
  }
}

// ============================================================================
// ПОЛУЧЕНИЕ ТИКЕТОВ
// ============================================================================

// Мои тикеты
export async function getMyTicketsAction(): Promise<GetTicketsResult> {
  try {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const { user } = authResult
    const db = getEnhancedPrisma(user)

    const tickets = await db.supportTicket.findMany({
      where: {
        authorId: user.id,
      },
      select: {
        id: true,
        category: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return { success: true, tickets }
  } catch (error) {
    console.error('Ошибка получения тикетов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// Конкретный тикет с сообщениями
export async function getTicketAction(ticketId: string): Promise<GetTicketResult> {
  try {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const { user } = authResult

    // Используем базовый prisma клиент вместо enhanced
    // чтобы избежать бага ZenStack v3 с policy alias конфликтами
    // Проверку доступа делаем вручную ниже (isAuthor || isAdmin)
    const { prisma } = await import('@/lib/db')

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            roles: true,
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
      },
    })

    if (!ticket) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права доступа
    const isAuthor = ticket.authorId === user.id
    const isAdmin = isOwner(user.roles)

    if (!isAuthor && !isAdmin) {
      return { success: false, error: 'FORBIDDEN' }
    }

    return { success: true, ticket }
  } catch (error) {
    console.error('Ошибка получения тикета:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// Все тикеты (для поддержки/владельца)
export async function getAllTicketsAction(): Promise<GetTicketsResult> {
  try {
    const authResult = await requireOwner()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const { user } = authResult
    const db = getEnhancedPrisma(user)

    const tickets = await db.supportTicket.findMany({
      select: {
        id: true,
        category: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
      orderBy: [
        { status: 'asc' }, // Открытые сначала
        { updatedAt: 'desc' },
      ],
    })

    return { success: true, tickets }
  } catch (error) {
    console.error('Ошибка получения всех тикетов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// Пометить тикет как решённый
export async function resolveTicketAction(data: CloseTicketData): Promise<SupportActionResult> {
  const parsed = CloseTicketSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'ID тикета обязателен' }
  }

  const authResult = await requireOwner()
  if (!authResult.success) {
    return { success: false, error: 'Недостаточно прав' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { ticketId } = parsed.data

    await db.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    })

    revalidatePath(`/support/${ticketId}`)
    revalidatePath('/support')
    return { success: true }
  } catch (error) {
    console.error('Ошибка решения тикета:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}
