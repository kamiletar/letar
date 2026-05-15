'use server'

/**
 * Обновление профиля пользователя (имя).
 */

import { prisma } from '@/lib/db'
import { z } from 'zod/v4'

const UpdateProfileSchema = z
  .object({
    name: z.string().min(2, 'Имя должно быть не менее 2 символов').max(100, 'Имя слишком длинное'),
  })
  .strip()

export async function updateProfile(input: { name: string }) {
  const { getSession } = await import('@/lib/auth')
  const session = await getSession()
  if (!session) {
    return { error: 'Не авторизован' }
  }

  const parsed = UpdateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Некорректные данные' }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
    })

    return { success: true }
  } catch (error) {
    console.error('[updateProfile] ошибка:', error)
    return { error: 'Не удалось обновить профиль' }
  }
}
