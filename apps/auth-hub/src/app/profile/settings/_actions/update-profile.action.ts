'use server'

import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const UpdateProfileSchema = z
  .object({
    name: z.string().min(1, 'Имя обязательно').max(100, 'Слишком длинное имя'),
  })
  .strip()

export type UpdateProfileResult = {
  success: boolean
  error?: string
}

/**
 * Обновление профиля пользователя (имя)
 */
export async function updateProfileAction(formData: FormData): Promise<UpdateProfileResult> {
  const session = await requireAuth()

  const parsed = UpdateProfileSchema.safeParse({
    name: formData.get('name'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
    })

    revalidatePath('/profile')
    revalidatePath('/profile/settings')
    revalidatePath('/')

    return { success: true }
  } catch {
    return { success: false, error: 'Не удалось обновить профиль' }
  }
}
