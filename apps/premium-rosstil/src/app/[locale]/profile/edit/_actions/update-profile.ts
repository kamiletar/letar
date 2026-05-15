'use server'

import type { Gender } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { type ProfileEditData, ProfileEditSchema } from '../_schemas/profile-edit.schema'

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export async function updateProfile(data: ProfileEditData): Promise<UpdateProfileResult> {
  // 1. Валидация
  const parsed = ProfileEditSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  // 2. Аутентификация
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const validatedData = parsed.data

  // 3. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 4. Подготовка данных для обновления
  // User table: name, email
  const userUpdateData: {
    name: string
    email: string
  } = {
    name: validatedData.name,
    email: validatedData.email,
  }

  // UserProfile table: gender, birthdate, phoneNumber
  const profileUpdateData: {
    gender?: Gender | null
    birthdate?: Date | null
    phoneNumber?: string | null
  } = {}

  // Обработка optional полей для профиля
  if (validatedData.gender !== undefined) {
    profileUpdateData.gender = validatedData.gender
  }

  if (validatedData.birthdate) {
    profileUpdateData.birthdate = new Date(validatedData.birthdate)
  } else if (validatedData.birthdate === null) {
    profileUpdateData.birthdate = null
  }

  if (validatedData.phoneNumber !== undefined) {
    profileUpdateData.phoneNumber = validatedData.phoneNumber || null
  }

  // 5. Обновление профиля с обработкой ошибок
  try {
    // Обновляем User (name, email)
    await db.user.update({
      where: { id: session.user.id },
      data: userUpdateData,
    })

    // Upsert UserProfile (gender, birthdate, phoneNumber)
    if (Object.keys(profileUpdateData).length > 0) {
      // Use raw prisma for upsert (ZenStack doesn't support upsert well)
      await prisma.userProfile.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          ...profileUpdateData,
        },
        update: profileUpdateData,
      })
    }
  } catch (error) {
    // Обработка unique constraint violation (email уже используется)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return {
        success: false,
        error: 'Email уже используется',
        fieldErrors: {
          email: ['Этот email уже используется другим пользователем'],
        },
      }
    }

    // Общая ошибка
    return { success: false, error: 'Не удалось обновить профиль. Попробуйте еще раз.' }
  }

  // 6. Инвалидируем кэш и возвращаем успех
  revalidatePath('/profile')
  revalidatePath('/profile/edit')

  return { success: true }
}
