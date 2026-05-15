'use server'

import { requireOwner } from '@/lib/action-helpers'
import { prisma } from '@/lib/db'

import type { AuditAction, AuditLog } from '@letar/driving-school-db/prisma'

// ============================================================================
// ТИПЫ
// ============================================================================

export interface AuditLogWithUser extends AuditLog {
  user: {
    id: string
    name: string | null
    email: string
  } | null
}

export interface GetAuditLogsFilters {
  action?: AuditAction | 'all'
  dateRange?: 'today' | 'week' | 'month' | 'all'
  search?: string
}

export interface GetAuditLogsResult {
  success: true
  logs: AuditLogWithUser[]
  totalPages: number
  currentPage: number
  totalCount: number
}

export interface GetAuditLogsErrorResult {
  success: false
  error: string
}

export type GetAuditLogsActionResult = GetAuditLogsResult | GetAuditLogsErrorResult

// ============================================================================
// ПОЛУЧЕНИЕ ЛОГОВ АУДИТА
// ============================================================================

const LOGS_PER_PAGE = 50

export async function getAuditLogsAction(filters: GetAuditLogsFilters, page = 1): Promise<GetAuditLogsActionResult> {
  try {
    // Только OWNER может просматривать аудит
    const authResult = await requireOwner()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    // Используем prisma напрямую для запросов с include

    // Строим условия фильтрации
    const where: {
      action?: AuditAction
      createdAt?: { gte: Date }
      user?: {
        OR: Array<
          { name: { contains: string; mode: 'insensitive' } } | { email: { contains: string; mode: 'insensitive' } }
        >
      }
    } = {}

    // Фильтр по типу действия
    if (filters.action && filters.action !== 'all') {
      where.action = filters.action
    }

    // Фильтр по дате
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }

      where.createdAt = { gte: startDate }
    }

    // Поиск по пользователю
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim()
      where.user = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      }
    }

    // Подсчёт и получение логов параллельно
    const [totalCount, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * LOGS_PER_PAGE,
        take: LOGS_PER_PAGE,
      }),
    ])
    const totalPages = Math.ceil(totalCount / LOGS_PER_PAGE)

    // Cast для совместимости типов JsonValue между ZenStack и Prisma
    return {
      success: true,
      logs: logs as unknown as AuditLogWithUser[],
      totalPages,
      currentPage: page,
      totalCount,
    }
  } catch (error) {
    console.error('Ошибка получения логов аудита:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
