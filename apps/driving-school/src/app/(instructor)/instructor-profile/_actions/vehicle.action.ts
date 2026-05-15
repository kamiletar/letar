'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { z } from 'zod/v4'

const VehicleSchema = z.object({
  id: z.string().optional(),
  brand: z.string().min(1, 'Укажите марку'),
  model: z.string().min(1, 'Укажите модель'),
  year: z.string().optional(),
  color: z.string().optional(),
  plateNumber: z.string().optional(),
  transmission: z.enum(['MANUAL', 'AUTOMATIC']),
})

export type VehicleActionResult = {
  success: boolean
  error?: string
  vehicleId?: string
}

/**
 * Создать новый автомобиль
 */
export async function createVehicleAction(data: z.infer<typeof VehicleSchema>): Promise<VehicleActionResult> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const parsed = VehicleSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const db = getEnhancedPrisma(session.user)

  // Получаем профиль инструктора
  const profile = await db.instructorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!profile) {
    return { success: false, error: 'Профиль инструктора не найден' }
  }

  // Проверяем, есть ли уже автомобили
  const existingCount = await db.instructorVehicle.count({
    where: { instructorProfileId: profile.id },
  })

  // Создаём автомобиль
  const vehicle = await db.instructorVehicle.create({
    data: {
      instructorProfileId: profile.id,
      brand: parsed.data.brand,
      model: parsed.data.model,
      year: parsed.data.year ? parseInt(parsed.data.year, 10) : null,
      color: parsed.data.color || null,
      plateNumber: parsed.data.plateNumber || null,
      transmission: parsed.data.transmission,
      isPrimary: existingCount === 0, // Первый автомобиль становится основным
    },
  })

  return { success: true, vehicleId: vehicle.id }
}

/**
 * Обновить автомобиль
 */
export async function updateVehicleAction(data: z.infer<typeof VehicleSchema>): Promise<VehicleActionResult> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Необходима авторизация' }
  }

  if (!data.id) {
    return { success: false, error: 'ID автомобиля не указан' }
  }

  const parsed = VehicleSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  const db = getEnhancedPrisma(session.user)

  // Проверяем, что автомобиль принадлежит этому инструктору
  const vehicle = await db.instructorVehicle.findFirst({
    where: {
      id: data.id,
      instructorProfile: { userId: session.user.id },
    },
  })

  if (!vehicle) {
    return { success: false, error: 'Автомобиль не найден' }
  }

  await db.instructorVehicle.update({
    where: { id: data.id },
    data: {
      brand: parsed.data.brand,
      model: parsed.data.model,
      year: parsed.data.year ? parseInt(parsed.data.year, 10) : null,
      color: parsed.data.color || null,
      plateNumber: parsed.data.plateNumber || null,
      transmission: parsed.data.transmission,
    },
  })

  return { success: true, vehicleId: data.id }
}

/**
 * Удалить автомобиль
 */
export async function deleteVehicleAction(vehicleId: string): Promise<VehicleActionResult> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const db = getEnhancedPrisma(session.user)

  // Проверяем, что автомобиль принадлежит этому инструктору и не основной
  const vehicle = await db.instructorVehicle.findFirst({
    where: {
      id: vehicleId,
      instructorProfile: { userId: session.user.id },
    },
  })

  if (!vehicle) {
    return { success: false, error: 'Автомобиль не найден' }
  }

  if (vehicle.isPrimary) {
    return { success: false, error: 'Нельзя удалить основной автомобиль' }
  }

  await db.instructorVehicle.delete({
    where: { id: vehicleId },
  })

  return { success: true }
}

/**
 * Установить автомобиль как основной
 */
export async function setPrimaryVehicleAction(vehicleId: string): Promise<VehicleActionResult> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const db = getEnhancedPrisma(session.user)

  // Получаем профиль и проверяем автомобиль
  const profile = await db.instructorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!profile) {
    return { success: false, error: 'Профиль инструктора не найден' }
  }

  const vehicle = await db.instructorVehicle.findFirst({
    where: {
      id: vehicleId,
      instructorProfileId: profile.id,
    },
  })

  if (!vehicle) {
    return { success: false, error: 'Автомобиль не найден' }
  }

  // Убираем флаг primary у всех автомобилей этого инструктора
  await db.instructorVehicle.updateMany({
    where: { instructorProfileId: profile.id },
    data: { isPrimary: false },
  })

  // Устанавливаем primary для выбранного
  await db.instructorVehicle.update({
    where: { id: vehicleId },
    data: { isPrimary: true },
  })

  return { success: true }
}
