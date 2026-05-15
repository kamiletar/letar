'use server'

import type { UserRole } from '@/generated/prisma'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type ToggleRoleResult = {
  success: boolean
  error?: string
  roles?: UserRole[]
}

/**
 * Переключение роли пользователя (добавить/убрать ADMIN)
 */
export async function toggleRoleAction(userId: string, role: UserRole): Promise<ToggleRoleResult> {
  const session = await requireAdmin()

  // Нельзя менять роли себе
  if (userId === session.user.id) {
    return { success: false, error: 'Нельзя менять свои роли' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    })

    if (!user) {
      return { success: false, error: 'Пользователь не найден' }
    }

    const hasRole = user.roles.includes(role)
    const newRoles = hasRole ? user.roles.filter((r) => r !== role) : [...user.roles, role]

    // Гарантируем что USER всегда есть
    if (!newRoles.includes('USER')) {
      newRoles.push('USER')
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { roles: newRoles },
      select: { roles: true },
    })

    revalidatePath('/admin/users')

    return { success: true, roles: updated.roles }
  } catch {
    return { success: false, error: 'Не удалось обновить роли' }
  }
}
