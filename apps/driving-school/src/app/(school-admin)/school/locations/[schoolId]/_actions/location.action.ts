'use server'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import type { File as FileModel, LocationFile, LocationType } from '@letar/driving-school-db/prisma'
import { revalidatePath } from 'next/cache'
import {
  type CreateLocationInput,
  CreateLocationSchema,
  type DeleteLocationInput,
  DeleteLocationSchema,
  type UpdateLocationInput,
  UpdateLocationSchema,
} from '../_schemas/location.schema'

// Тип LocationFile с включённой связью file
export type LocationFileWithFile = LocationFile & {
  file: FileModel
}

// Тип TeamLocationData на основе schema.zmodel (модель ещё не сгенерирована в Prisma)
export type TeamLocationData = {
  id: string
  teamId: string
  type: LocationType
  city: string
  address: string
  phone: string | null
  description: string | null
  timezone: string | null
  geoLat: string | null
  geoLon: string | null
  workingHours: unknown
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Типы для работы с филиалами (Team + TeamLocationData)
export type LocationWithDetails = {
  id: string
  name: string
  organizationId: string
  locationData: TeamLocationData | null
  files: LocationFileWithFile[]
  createdAt: Date
}

export type GetLocationsResult = { success: true; locations: LocationWithDetails[] } | { success: false; error: string }

interface ActionResult {
  success: boolean
  error?: { formErrors?: string[] }
}

// Получить список филиалов школы (Team + TeamLocationData)
export async function getLocationsAction(organizationId: string): Promise<GetLocationsResult> {
  const authResult = await requireSchoolManager(organizationId)
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const db = getEnhancedPrisma(authResult.user)

  const teams = await db.team.findMany({
    where: { organizationId },
    orderBy: [{ name: 'asc' }],
    include: {
      locationData: true,
      files: {
        include: { file: true },
        orderBy: { order: 'asc' },
      },
    },
  })

  // Преобразуем Team + TeamLocationData в LocationWithDetails
  // Сортируем: активные сначала, затем по типу, затем по имени
  const locations: LocationWithDetails[] = teams
    .map((team) => ({
      id: team.id,
      name: team.name,
      organizationId: team.organizationId,
      locationData: team.locationData,
      files: team.files as unknown as LocationFileWithFile[],
      createdAt: team.createdAt,
    }))
    .sort((a, b) => {
      // Активные сначала
      const aActive = a.locationData?.isActive ?? true
      const bActive = b.locationData?.isActive ?? true
      if (aActive !== bActive) {
        return bActive ? 1 : -1
      }
      // По типу (соответствует enum LocationType из schema.zmodel)
      const typeOrder: Record<string, number> = {
        OFFICE: 0,
        CLASSROOM: 1,
        TRAINING: 2,
        DOCUMENTS_ONLY: 3,
        PRACTICE_ONLY: 4,
        FULL_SERVICE: 5,
      }
      const aType = a.locationData?.type ?? 'OFFICE'
      const bType = b.locationData?.type ?? 'OFFICE'
      const aOrder = typeOrder[aType] ?? 99
      const bOrder = typeOrder[bType] ?? 99
      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }
      // По имени
      return a.name.localeCompare(b.name)
    })

  return { success: true, locations }
}

// Создать филиал (Team + TeamLocationData)
export async function createLocationAction(data: CreateLocationInput): Promise<ActionResult> {
  const parsed = CreateLocationSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: { formErrors: ['Некорректные данные'] } }
  }

  const { organizationId, name, type, city, address, phone, description, workingHours, timezone, geoLat, geoLon } =
    parsed.data

  const authResult = await requireSchoolManager(organizationId)
  if (!authResult.success) {
    return { success: false, error: { formErrors: ['У вас нет прав на добавление филиалов'] } }
  }

  const db = getEnhancedPrisma(authResult.user)

  try {
    // Парсим часы работы из JSON строки
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedWorkingHours: any
    if (workingHours) {
      try {
        parsedWorkingHours = JSON.parse(workingHours)
      } catch {
        // Если не JSON — игнорируем
      }
    }

    // Создаём Team с вложенным TeamLocationData
    await db.team.create({
      data: {
        organizationId,
        name: name.trim(),
        locationData: {
          create: {
            type: type as LocationType,
            city: city.trim(),
            address: address.trim(),
            phone: phone?.trim() || null,
            description: description?.trim() || null,
            workingHours: parsedWorkingHours,
            timezone: timezone || null,
            geoLat: geoLat || null,
            geoLon: geoLon || null,
          },
        },
      },
    })

    // Обновляем metadata организации с городами
    await updateOrganizationCities(organizationId, db)

    revalidatePath(`/school/locations/${organizationId}`)
    revalidatePath(`/school/${organizationId}`)
    revalidatePath('/schools')

    return { success: true }
  } catch (error) {
    console.error('Create location error:', error)
    return { success: false, error: { formErrors: ['Не удалось создать филиал. Попробуйте позже.'] } }
  }
}

// Обновить филиал (Team + TeamLocationData)
export async function updateLocationAction(data: UpdateLocationInput): Promise<ActionResult> {
  const parsed = UpdateLocationSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: { formErrors: ['Некорректные данные'] } }
  }

  const {
    locationId,
    organizationId,
    name,
    type,
    city,
    address,
    phone,
    description,
    workingHours,
    isActive,
    timezone,
    geoLat,
    geoLon,
  } = parsed.data

  const authResult = await requireSchoolManager(organizationId)
  if (!authResult.success) {
    return { success: false, error: { formErrors: ['У вас нет прав на редактирование филиалов'] } }
  }

  const db = getEnhancedPrisma(authResult.user)

  try {
    // Проверяем, что Team принадлежит этой организации
    const team = await db.team.findUnique({
      where: { id: locationId },
      include: { locationData: true },
    })

    if (!team || team.organizationId !== organizationId) {
      return { success: false, error: { formErrors: ['Филиал не найден'] } }
    }

    // Парсим часы работы из JSON строки
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedWorkingHours: any
    if (workingHours) {
      try {
        parsedWorkingHours = JSON.parse(workingHours)
      } catch {
        // Если не JSON — игнорируем
      }
    }

    // Обновляем Team name
    await db.team.update({
      where: { id: locationId },
      data: { name: name.trim() },
    })

    // Обновляем или создаём TeamLocationData
    if (team.locationData) {
      await db.teamLocationData.update({
        where: { teamId: locationId },
        data: {
          type: type as LocationType,
          city: city.trim(),
          address: address.trim(),
          phone: phone?.trim() || null,
          description: description?.trim() || null,
          workingHours: parsedWorkingHours,
          isActive: isActive ?? true,
          timezone: timezone || null,
          geoLat: geoLat || null,
          geoLon: geoLon || null,
        },
      })
    } else {
      await db.teamLocationData.create({
        data: {
          teamId: locationId,
          type: type as LocationType,
          city: city.trim(),
          address: address.trim(),
          phone: phone?.trim() || null,
          description: description?.trim() || null,
          workingHours: parsedWorkingHours,
          isActive: isActive ?? true,
          timezone: timezone || null,
          geoLat: geoLat || null,
          geoLon: geoLon || null,
        },
      })
    }

    // Обновляем metadata организации с городами
    await updateOrganizationCities(organizationId, db)

    revalidatePath(`/school/locations/${organizationId}`)
    revalidatePath(`/school/${organizationId}`)
    revalidatePath('/schools')

    return { success: true }
  } catch (error) {
    console.error('Update location error:', error)
    return { success: false, error: { formErrors: ['Не удалось обновить филиал. Попробуйте позже.'] } }
  }
}

// Удалить филиал (Team + TeamLocationData)
export async function deleteLocationAction(data: DeleteLocationInput): Promise<ActionResult> {
  const parsed = DeleteLocationSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: { formErrors: ['Некорректные данные'] } }
  }

  const { locationId, organizationId } = parsed.data

  const authResult = await requireSchoolManager(organizationId)
  if (!authResult.success) {
    return { success: false, error: { formErrors: ['У вас нет прав на удаление филиалов'] } }
  }

  const db = getEnhancedPrisma(authResult.user)

  try {
    // Проверяем, что Team принадлежит этой организации
    const team = await db.team.findUnique({
      where: { id: locationId },
    })

    if (!team || team.organizationId !== organizationId) {
      return { success: false, error: { formErrors: ['Филиал не найден'] } }
    }

    // Удаляем Team (TeamLocationData удалится каскадно)
    await db.team.delete({
      where: { id: locationId },
    })

    // Обновляем metadata организации с городами
    await updateOrganizationCities(organizationId, db)

    revalidatePath(`/school/locations/${organizationId}`)
    revalidatePath(`/school/${organizationId}`)
    revalidatePath('/schools')

    return { success: true }
  } catch (error) {
    console.error('Delete location error:', error)
    return { success: false, error: { formErrors: ['Не удалось удалить филиал. Попробуйте позже.'] } }
  }
}

// Вспомогательная функция для обновления metadata организации с городами
async function updateOrganizationCities(organizationId: string, db: ReturnType<typeof getEnhancedPrisma>) {
  // Получаем все уникальные города из активных филиалов
  const teams = await db.team.findMany({
    where: { organizationId },
    include: {
      locationData: {
        where: { isActive: true },
        select: { city: true },
      },
    },
  })

  const uniqueCities = [...new Set(teams.flatMap((t) => (t.locationData?.city ? [t.locationData.city] : [])))]

  // Получаем текущий metadata
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { metadata: true },
  })

  // Парсим и обновляем metadata
  let metadata: Record<string, unknown> = {}
  if (org?.metadata) {
    try {
      metadata = JSON.parse(org.metadata)
    } catch {
      // Игнорируем ошибку парсинга
    }
  }
  metadata.cities = uniqueCities

  // Обновляем организацию
  await db.organization.update({
    where: { id: organizationId },
    data: { metadata: JSON.stringify(metadata) },
  })
}
