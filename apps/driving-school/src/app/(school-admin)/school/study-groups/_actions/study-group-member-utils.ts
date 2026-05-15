'use server'

/**
 * Вспомогательные функции для управления участниками групп
 *
 * ВАЖНО: Этот файл содержит 'use server' так как импортирует @/lib/db
 * и может выполняться ТОЛЬКО на сервере.
 */

import { getEnhancedPrisma } from '@/lib/db'
import type { UserRole } from '@letar/driving-school-db/prisma'

/**
 * Проверка прав на управление группой
 */
export async function canManageGroup(
  userId: string,
  groupId: string,
  user: { id: string; roles: UserRole[] }
): Promise<{ canManage: boolean; organizationId: string | null }> {
  const db = getEnhancedPrisma(user)

  const group = await db.studyGroup.findUnique({
    where: { id: groupId },
    select: { organizationId: true },
  })

  if (!group) {
    return { canManage: false, organizationId: null }
  }

  const membership = await db.member.findFirst({
    where: {
      userId,
      organizationId: group.organizationId,
      role: { in: ['owner', 'super_manager', 'manager'] },
    },
  })

  return { canManage: !!membership, organizationId: group.organizationId }
}
