'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { type MeasurementsFormData, MeasurementsFormSchema } from '../_schemas/measurements-form.schema'

export type UpsertMeasurementsResult = { success: true; redirect: string } | { success: false; error: string }

export async function upsertMeasurements(data: MeasurementsFormData): Promise<UpsertMeasurementsResult> {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  // 2. Валидация
  const parsed = MeasurementsFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  // 3. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 4. Подготовка данных - преобразуем пустые строки в null/undefined
  const prepareValue = <T>(value: T | '' | undefined): T | null => {
    if (value === '' || value === undefined) {
      return null
    }
    return value as T
  }

  const validatedData = parsed.data
  const measurementsData = {
    gender: validatedData.gender,
    bust: prepareValue(validatedData.bust),
    waist: prepareValue(validatedData.waist),
    hips: prepareValue(validatedData.hips),
    height: prepareValue(validatedData.height),
    preferredSize: prepareValue(validatedData.preferredSize),
    notes: prepareValue(validatedData.notes),
  }

  // 5. Upsert замеров с обработкой ошибок
  try {
    await db.userMeasurements.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...measurementsData,
      },
      update: measurementsData,
    })
  } catch (error) {
    console.error('Failed to save measurements:', error)
    return { success: false, error: 'Не удалось сохранить замеры. Попробуйте еще раз.' }
  }

  // 6. Инвалидируем кэш и возвращаем успех
  revalidatePath('/profile/measurements')
  revalidatePath('/profile/measurements/edit')
  return { success: true, redirect: '/profile/measurements' }
}
