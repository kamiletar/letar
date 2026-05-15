'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

import { requireOwner } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'

import type { UserRole } from '@letar/driving-school-db/prisma'

// ============================================================================
// СХЕМЫ ВАЛИДАЦИИ
// ============================================================================

const UpdateUserRolesSchema = z
  .object({
    userId: z.string(),
    roles: z.array(z.enum(['USER', 'FREELANCE_INSTRUCTOR', 'MODERATOR', 'OWNER'])),
  })
  .strip()

const ToggleUserBlockSchema = z
  .object({
    userId: z.string(),
  })
  .strip()

const BulkBlockUsersSchema = z
  .object({
    userIds: z.array(z.string()).min(1),
    block: z.boolean(),
  })
  .strip()

type UpdateUserRolesInput = z.infer<typeof UpdateUserRolesSchema>
type ToggleUserBlockInput = z.infer<typeof ToggleUserBlockSchema>
type BulkBlockUsersInput = z.infer<typeof BulkBlockUsersSchema>

// ============================================================================
// ТИПЫ РЕЗУЛЬТАТОВ
// ============================================================================

interface ActionResult {
  success: boolean
  error?: string
}

export interface UserListItem {
  id: string
  name: string | null
  email: string
  roles: UserRole[]
  deletedAt: Date | null
  createdAt: Date
  _count: {
    organizationMembers: number
    lessonsAsStudent: number
    lessonsAsInstructor: number
  }
}

export type GetUsersListResult =
  | { success: true; users: UserListItem[]; total: number }
  | { success: false; error: string }

// ============================================================================
// ПОЛУЧЕНИЕ СПИСКА ПОЛЬЗОВАТЕЛЕЙ
// ============================================================================

export async function getUsersListAction(
  filter: 'all' | 'users' | 'freelance-instructors' | 'moderators' | 'owners' = 'all',
  search?: string,
  page = 1,
  pageSize = 20
): Promise<GetUsersListResult> {
  try {
    const authResult = await requireOwner()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const { user } = authResult
    const db = getEnhancedPrisma(user)

    // Фильтр по ролям
    const roleFilter: { roles?: { has: UserRole } } = {}
    if (filter === 'users') {
      roleFilter.roles = { has: 'USER' }
    } else if (filter === 'freelance-instructors') {
      roleFilter.roles = { has: 'FREELANCE_INSTRUCTOR' }
    } else if (filter === 'moderators') {
      roleFilter.roles = { has: 'MODERATOR' }
    } else if (filter === 'owners') {
      roleFilter.roles = { has: 'OWNER' }
    }

    // Фильтр по поиску
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const where = {
      ...roleFilter,
      ...searchFilter,
    }

    // Получаем пользователей с пагинацией
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          roles: true,
          deletedAt: true,
          createdAt: true,
          _count: {
            select: {
              organizationMembers: true,
              lessonsAsStudent: true,
              lessonsAsInstructor: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ])

    return { success: true, users, total }
  } catch (error) {
    console.error('Ошибка получения списка пользователей:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// ============================================================================
// ИЗМЕНЕНИЕ РОЛЕЙ ПОЛЬЗОВАТЕЛЯ
// ============================================================================

export async function updateUserRolesAction(data: UpdateUserRolesInput): Promise<ActionResult> {
  const parsed = UpdateUserRolesSchema.safeParse(data)
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
    const { userId, roles } = parsed.data

    // Проверяем, что пользователь существует
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, roles: true },
    })

    if (!targetUser) {
      return { success: false, error: 'Пользователь не найден' }
    }

    // Обновляем роли
    await db.user.update({
      where: { id: userId },
      data: { roles },
    })

    // Логируем в аудит
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'OWNER_USER_ROLE_CHANGE',
        entityType: 'User',
        entityId: userId,
        payload: {
          oldRoles: targetUser.roles,
          newRoles: roles,
          userName: targetUser.name,
          userEmail: targetUser.email,
        },
      },
    })

    revalidatePath('/owner/users')
    return { success: true }
  } catch (error) {
    console.error('Ошибка изменения ролей пользователя:', error)
    return { success: false, error: 'Произошла ошибка при изменении ролей' }
  }
}

// ============================================================================
// БЛОКИРОВКА/РАЗБЛОКИРОВКА ПОЛЬЗОВАТЕЛЯ
// ============================================================================

export async function toggleUserBlockAction(data: ToggleUserBlockInput): Promise<ActionResult> {
  const parsed = ToggleUserBlockSchema.safeParse(data)
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
    const { userId } = parsed.data

    // Проверяем, что пользователь существует
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, deletedAt: true },
    })

    if (!targetUser) {
      return { success: false, error: 'Пользователь не найден' }
    }

    // Нельзя блокировать самого себя
    if (targetUser.id === user.id) {
      return { success: false, error: 'Нельзя заблокировать самого себя' }
    }

    // Переключаем состояние блокировки
    const isBlocking = targetUser.deletedAt === null

    await db.user.update({
      where: { id: userId },
      data: {
        deletedAt: isBlocking ? new Date() : null,
      },
    })

    // Логируем в аудит
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: isBlocking ? 'OWNER_USER_BLOCK' : 'OWNER_USER_UNBLOCK',
        entityType: 'User',
        entityId: userId,
        payload: {
          userName: targetUser.name,
          userEmail: targetUser.email,
        },
      },
    })

    revalidatePath('/owner/users')
    return { success: true }
  } catch (error) {
    console.error('Ошибка блокировки/разблокировки пользователя:', error)
    return { success: false, error: 'Произошла ошибка при изменении статуса пользователя' }
  }
}

// ============================================================================
// МАССОВАЯ БЛОКИРОВКА/РАЗБЛОКИРОВКА ПОЛЬЗОВАТЕЛЕЙ
// ============================================================================

export async function bulkBlockUsersAction(data: BulkBlockUsersInput): Promise<ActionResult> {
  const parsed = BulkBlockUsersSchema.safeParse(data)
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
    const { userIds, block } = parsed.data

    // Исключаем текущего пользователя из списка
    const filteredIds = userIds.filter((id) => id !== user.id)

    if (filteredIds.length === 0) {
      return { success: false, error: 'Нельзя заблокировать самого себя' }
    }

    // Массовое обновление
    await db.user.updateMany({
      where: { id: { in: filteredIds } },
      data: { deletedAt: block ? new Date() : null },
    })

    // Логируем в аудит
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: block ? 'OWNER_USER_BLOCK' : 'OWNER_USER_UNBLOCK',
        entityType: 'User',
        entityId: filteredIds.join(','),
        payload: {
          count: filteredIds.length,
          userIds: filteredIds,
        },
      },
    })

    revalidatePath('/owner/users')
    return { success: true }
  } catch (error) {
    console.error('Ошибка массовой блокировки пользователей:', error)
    return { success: false, error: 'Произошла ошибка при массовой блокировке' }
  }
}

// ============================================================================
// ЭКСПОРТ ПОЛЬЗОВАТЕЛЕЙ
// ============================================================================

export interface UserExportData {
  id: string
  name: string | null
  email: string
  roles: string
  status: string
  createdAt: string
  organizationMembers: number
  lessonsTotal: number
}

export type ExportUsersResult = { success: true; data: UserExportData[] } | { success: false; error: string }

/**
 * Получение данных пользователей для экспорта
 * Возвращает все данные без пагинации для выгрузки в CSV/Excel
 */
export async function exportUsersAction(): Promise<ExportUsersResult> {
  try {
    const authResult = await requireOwner()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const { user } = authResult
    const db = getEnhancedPrisma(user)

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        deletedAt: true,
        createdAt: true,
        organizationMembers: { select: { id: true } },
        lessonsAsStudent: { select: { id: true } },
        lessonsAsInstructor: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Форматируем данные для экспорта
    const exportData: UserExportData[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.roles.join(', '),
      status: u.deletedAt ? 'Заблокирован' : 'Активен',
      createdAt: new Date(u.createdAt).toLocaleDateString('ru-RU'),
      organizationMembers: u.organizationMembers?.length ?? 0,
      lessonsTotal: (u.lessonsAsStudent?.length ?? 0) + (u.lessonsAsInstructor?.length ?? 0),
    }))

    return { success: true, data: exportData }
  } catch (error) {
    console.error('Ошибка экспорта пользователей:', error)
    return { success: false, error: 'Ошибка при экспорте данных' }
  }
}
