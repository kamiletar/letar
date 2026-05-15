'use server'

import { type ClientProfileEditInput, ClientProfileEditSchema } from '@/app/_schemas/client-profile.schema'
import type { UpdateClientProfileResult } from '@/app/_types/client-profile.types'
import type { Gender } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { getEnhancedPrisma } from '@/lib/db'
import { generateNumerologyProfileData } from '@/lib/utils/numerology'
import { revalidatePath } from 'next/cache'

/**
 * Server Action для обновления профиля клиента
 * Обновляет данные в моделях User и Client
 */
export async function updateClientProfile(data: ClientProfileEditInput): Promise<UpdateClientProfileResult> {
  // 1. Проверяем аутентификацию
  const user = await requireAuth()

  // 2. Парсинг и валидация
  const parsed = ClientProfileEditSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  try {
    // ZenStack v3: enhanced client с access control
    const db = getEnhancedPrisma(user)

    // 3. Обновляем данные пользователя в модели User
    await db.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phoneNumber: parsed.data.phoneNumber || null,
        image: parsed.data.image || null,
      },
    })

    // 4. Находим или создаем клиентский профиль
    const clientProfile = await db.client.findUnique({
      where: { userId: user.id },
    })

    // 5. Подготавливаем данные для Client
    const clientData = {
      name: parsed.data.name,
      email: user.email ?? '', // email обязателен в Client
      phone: parsed.data.phone ?? null,
      gender: parsed.data.gender ? (parsed.data.gender as Gender) : null,
      birthdate: parsed.data.birthdate ? new Date(parsed.data.birthdate) : null,
      photo: parsed.data.image ?? null,
    }

    let clientId: string

    if (clientProfile) {
      // Обновляем существующий профиль
      await db.client.update({
        where: { id: clientProfile.id },
        data: clientData,
      })
      clientId = clientProfile.id
    } else {
      // Создаем новый профиль (нужен specialistId - используем первого SPECIALIST или ADMIN)
      const specialist = await db.user.findFirst({
        where: {
          OR: [{ role: 'SPECIALIST' }, { role: 'ADMIN' }],
        },
      })

      if (!specialist) {
        throw new Error('Не найден специалист для привязки клиента')
      }

      const newClient = await db.client.create({
        data: {
          ...clientData,
          userId: user.id,
          specialistId: specialist.id,
        },
      })
      clientId = newClient.id
    }

    // 6. Автоматическая генерация нумерологического профиля, если указана дата рождения
    if (clientData.birthdate) {
      try {
        const numerologyData = generateNumerologyProfileData(clientData.birthdate)

        // Проверяем, существует ли уже нумерологический профиль
        const existingNumerology = await db.numerologyProfile.findUnique({
          where: { clientId },
        })

        if (!existingNumerology) {
          // Создаем только если профиля еще нет
          await db.numerologyProfile.create({
            data: {
              clientId,
              ...numerologyData,
            },
          })
        }
      } catch (error) {
        console.error('Failed to generate numerology profile:', error)
        // Продолжаем даже если не удалось сгенерировать профиль
      }
    }

    // 7. Ревалидируем страницы профиля
    revalidatePath('/my-profile')
    revalidatePath('/my-profile/edit')
    revalidatePath('/diagnostics')

    return { success: true }
  } catch (error) {
    console.error('Error updating client profile:', error)
    return { success: false, error: 'Произошла ошибка при обновлении профиля. Попробуйте еще раз.' }
  }
}
