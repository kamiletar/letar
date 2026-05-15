'use server'

import { type ProfileEditInput, ProfileEditSchema } from '@/app/_schemas/profile.schema'
import type { UpdateProfileResult } from '@/app/_types/profile.types'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Server Action для обновления профиля пользователя
 */
export async function updateProfile(data: ProfileEditInput): Promise<UpdateProfileResult> {
  // Проверяем аутентификацию
  const user = await requireAuth()

  // Парсим и валидируем данные
  const parsed = ProfileEditSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  try {
    // Обновляем данные пользователя в БД
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phoneNumber: parsed.data.phoneNumber || null,
        image: parsed.data.image || null,
      },
    })

    // Ревалидируем страницы профиля
    revalidatePath('/profile')
    revalidatePath('/profile/edit')

    return { success: true }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: 'Произошла ошибка при обновлении профиля. Попробуйте еще раз.' }
  }
}
