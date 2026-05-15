'use server'

import { requireAuth } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'

import type { UpdateProfileData } from '../_schemas/profile.schema'

export type UpdateProfileResult = { success: true } | { success: false; error: string }

export async function updateProfileAction(data: UpdateProfileData): Promise<UpdateProfileResult> {
  const authResult = await requireAuth()

  if (!authResult.success) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        name: data.name || null,
        phone: data.phone || null,
      },
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Ошибка при сохранении профиля' }
  }
}
