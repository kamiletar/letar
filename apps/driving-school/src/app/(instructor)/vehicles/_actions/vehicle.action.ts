'use server'

import { revalidatePath } from 'next/cache'

import type { AuthError } from '@/lib/action-helpers'
import { withInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import type { File as FileModel, LicenseCategory, TransmissionType, VehicleFile } from '@letar/driving-school-db/prisma'
import {
  type VehicleAvailabilityData,
  VehicleAvailabilitySchema,
  type VehicleInput,
  VehicleInputSchema,
} from '../_schemas/vehicle-form.schema'

// === Типы результатов ===

// Тип VehicleFile с включённой связью file
export type VehicleFileWithFile = VehicleFile & {
  file: FileModel
}

export interface VehicleData {
  id: string
  brand: string
  model: string
  plateNumber: string | null
  transmission: TransmissionType
  year: number | null
  color: string | null
  licenseCategories: LicenseCategory[]
  images: string[] | null
  isPrimary: boolean
  isActive: boolean
  isAvailable: boolean
  unavailableReason: string | null
  createdAt: Date
  updatedAt: Date
  files?: VehicleFileWithFile[]
}

export type GetVehiclesResult =
  | { success: true; vehicles: VehicleData[] }
  | { success: false; error: AuthError | 'UNKNOWN_ERROR' }

export type VehicleActionResult = { success: true; id?: string } | { success: false; error: string }

// === Получение списка автомобилей ===

export async function getVehicles(): Promise<GetVehiclesResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const vehicles = await db.instructorVehicle.findMany({
        where: {
          instructorProfileId,
        },
        include: {
          files: {
            include: { file: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: [{ isPrimary: 'desc' }, { isActive: 'desc' }, { createdAt: 'asc' }],
      })

      // Преобразуем images из Json в string[]
      const serializedVehicles = vehicles.map((vehicle) => ({
        ...vehicle,
        images: vehicle.images as string[] | null,
        files: vehicle.files,
      }))

      return { success: true, vehicles: serializedVehicles }
    } catch (error) {
      console.error('Ошибка получения автомобилей:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Получение одного автомобиля ===

export async function getVehicle(
  id: string
): Promise<{ success: true; vehicle: VehicleData } | { success: false; error: string }> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const vehicle = await db.instructorVehicle.findFirst({
        where: {
          id,
          instructorProfileId,
        },
        include: {
          files: {
            include: { file: true },
            orderBy: { order: 'asc' },
          },
        },
      })

      if (!vehicle) {
        return { success: false, error: 'NOT_FOUND' }
      }

      return {
        success: true,
        vehicle: {
          ...vehicle,
          images: vehicle.images as string[] | null,
          files: vehicle.files,
        },
      }
    } catch (error) {
      console.error('Ошибка получения автомобиля:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Создание автомобиля ===

export async function createVehicleAction(data: VehicleInput): Promise<VehicleActionResult> {
  const parsed = VehicleInputSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const {
        brand,
        model,
        plateNumber,
        transmission,
        year,
        color,
        licenseCategories,
        isPrimary,
        isActive,
        isAvailable,
        unavailableReason,
      } = parsed.data

      // Если новый автомобиль — основной, убираем флаг с остальных
      if (isPrimary) {
        await db.instructorVehicle.updateMany({
          where: { instructorProfileId },
          data: { isPrimary: false },
        })
      }

      const vehicle = await db.instructorVehicle.create({
        data: {
          instructorProfileId,
          brand,
          model,
          plateNumber,
          transmission: transmission as TransmissionType,
          year,
          color,
          licenseCategories: licenseCategories as LicenseCategory[],
          isPrimary: isPrimary ?? false,
          isActive: isActive ?? true,
          isAvailable: isAvailable ?? true,
          unavailableReason,
        },
      })

      revalidatePath('/vehicles')
      return { success: true, id: vehicle.id }
    } catch (error) {
      console.error('Ошибка создания автомобиля:', error)
      return { success: false, error: 'Произошла ошибка при создании' }
    }
  })
}

// === Обновление автомобиля ===

export async function updateVehicleAction(data: VehicleInput): Promise<VehicleActionResult> {
  if (!data.id) {
    return { success: false, error: 'ID автомобиля не указан' }
  }

  const parsed = VehicleInputSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    // Проверяем, что автомобиль принадлежит текущему инструктору
    const existingVehicle = await db.instructorVehicle.findFirst({
      where: {
        id: data.id,
        instructorProfileId,
      },
    })

    if (!existingVehicle) {
      return { success: false, error: 'Автомобиль не найден' }
    }

    try {
      const {
        id,
        brand,
        model,
        plateNumber,
        transmission,
        year,
        color,
        licenseCategories,
        isPrimary,
        isActive,
        isAvailable,
        unavailableReason,
      } = parsed.data

      // Если автомобиль становится основным, убираем флаг с остальных
      if (isPrimary && !existingVehicle.isPrimary) {
        await db.instructorVehicle.updateMany({
          where: {
            instructorProfileId,
            id: { not: id },
          },
          data: { isPrimary: false },
        })
      }

      await db.instructorVehicle.update({
        where: { id },
        data: {
          brand,
          model,
          plateNumber,
          transmission: transmission as TransmissionType,
          year,
          color,
          licenseCategories: licenseCategories as LicenseCategory[],
          isPrimary: isPrimary ?? false,
          isActive: isActive ?? true,
          isAvailable: isAvailable ?? true,
          unavailableReason,
        },
      })

      revalidatePath('/vehicles')
      revalidatePath(`/vehicles/${id}/edit`)
      return { success: true }
    } catch (error) {
      console.error('Ошибка обновления автомобиля:', error)
      return { success: false, error: 'Произошла ошибка при обновлении' }
    }
  })
}

// === Удаление (деактивация) автомобиля ===

export async function deleteVehicle(id: string): Promise<VehicleActionResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const vehicle = await db.instructorVehicle.findFirst({
        where: { id, instructorProfileId },
      })

      if (!vehicle) {
        return { success: false, error: 'Автомобиль не найден' }
      }

      // Мягкое удаление — устанавливаем isActive = false
      await db.instructorVehicle.update({
        where: { id },
        data: { isActive: false },
      })

      revalidatePath('/vehicles')
      return { success: true }
    } catch (error) {
      console.error('Ошибка удаления автомобиля:', error)
      return { success: false, error: 'Произошла ошибка при удалении' }
    }
  })
}

// === Восстановление автомобиля ===

export async function restoreVehicle(id: string): Promise<VehicleActionResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const vehicle = await db.instructorVehicle.findFirst({
        where: { id, instructorProfileId },
      })

      if (!vehicle) {
        return { success: false, error: 'Автомобиль не найден' }
      }

      await db.instructorVehicle.update({
        where: { id },
        data: { isActive: true },
      })

      revalidatePath('/vehicles')
      return { success: true }
    } catch (error) {
      console.error('Ошибка восстановления автомобиля:', error)
      return { success: false, error: 'Произошла ошибка при восстановлении' }
    }
  })
}

// === Установка основного автомобиля ===

export async function setPrimaryVehicle(id: string): Promise<VehicleActionResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const vehicle = await db.instructorVehicle.findFirst({
        where: { id, instructorProfileId },
      })

      if (!vehicle) {
        return { success: false, error: 'Автомобиль не найден' }
      }

      // Убираем флаг основного со всех автомобилей
      await db.instructorVehicle.updateMany({
        where: { instructorProfileId },
        data: { isPrimary: false },
      })

      // Устанавливаем текущий как основной
      await db.instructorVehicle.update({
        where: { id },
        data: { isPrimary: true },
      })

      revalidatePath('/vehicles')
      return { success: true }
    } catch (error) {
      console.error('Ошибка установки основного автомобиля:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}

// === Изменение доступности автомобиля ===

export async function updateVehicleAvailabilityAction(
  data: VehicleAvailabilityData & { id: string }
): Promise<VehicleActionResult> {
  if (!data.id) {
    return { success: false, error: 'ID автомобиля не указан' }
  }

  const parsed = VehicleAvailabilitySchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    const existingVehicle = await db.instructorVehicle.findFirst({
      where: { id: data.id, instructorProfileId },
    })

    if (!existingVehicle) {
      return { success: false, error: 'Автомобиль не найден' }
    }

    try {
      const { isAvailable, unavailableReason } = parsed.data

      await db.instructorVehicle.update({
        where: { id: data.id },
        data: {
          isAvailable,
          unavailableReason: isAvailable ? null : unavailableReason,
        },
      })

      revalidatePath('/vehicles')
      return { success: true }
    } catch (error) {
      console.error('Ошибка изменения доступности:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}
