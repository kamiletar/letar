'use server'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'

// === Типы для точек встречи ===

export interface MeetingPointSummary {
  id: string
  name: string
  address: string
  description: string | null
  geoLat: string | null
  geoLon: string | null
  team: {
    id: string
    name: string
  } | null
  isActive: boolean
  isDefault: boolean
  instructorsCount: number
}

// === Результаты операций ===

export type GetMeetingPointsResult =
  | { success: true; meetingPoints: MeetingPointSummary[] }
  | { success: false; error: ActionErrorCode }

export type CreateMeetingPointResult =
  | { success: true; meetingPointId: string }
  | { success: false; error: ActionErrorCode; message?: string }

export type UpdateMeetingPointResult = { success: true } | { success: false; error: ActionErrorCode; message?: string }

export type DeleteMeetingPointResult = { success: true } | { success: false; error: ActionErrorCode; message?: string }

// === Получение списка точек встречи ===

export async function getMeetingPointsAction(organizationId: string): Promise<GetMeetingPointsResult> {
  try {
    const authResult = await requireSchoolManager(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const meetingPoints = await db.practiceMeetingPoint.findMany({
      where: { organizationId },
      include: {
        team: {
          select: { id: true, name: true },
        },
        _count: {
          select: { instructors: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { isDefault: 'desc' }, { name: 'asc' }],
    })

    // Cast для совместимости типов с _count между ZenStack и Prisma
    type MeetingPointWithCount = (typeof meetingPoints)[number] & { _count: { instructors: number } }
    const summaries: MeetingPointSummary[] = (meetingPoints as MeetingPointWithCount[]).map(
      (mp: MeetingPointWithCount) => ({
        id: mp.id,
        name: mp.name,
        address: mp.address,
        description: mp.description,
        geoLat: mp.geoLat,
        geoLon: mp.geoLon,
        team: mp.team,
        isActive: mp.isActive,
        isDefault: mp.isDefault,
        instructorsCount: mp._count.instructors,
      })
    )

    return { success: true, meetingPoints: summaries }
  } catch (error) {
    console.error('Ошибка получения списка точек встречи:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Создание точки встречи ===

export interface CreateMeetingPointData {
  organizationId: string
  name: string
  address: string
  description?: string | null
  geoLat?: string | null
  geoLon?: string | null
  teamId?: string | null
  isDefault?: boolean
}

export async function createMeetingPointAction(data: CreateMeetingPointData): Promise<CreateMeetingPointResult> {
  try {
    const authResult = await requireSchoolManager(data.organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Валидация
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Название обязательно' }
    }

    if (!data.address || data.address.trim().length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Адрес обязателен' }
    }

    // Если это точка по умолчанию, сбрасываем флаг у других
    if (data.isDefault) {
      await db.practiceMeetingPoint.updateMany({
        where: { organizationId: data.organizationId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const meetingPoint = await db.practiceMeetingPoint.create({
      data: {
        organizationId: data.organizationId,
        name: data.name.trim(),
        address: data.address.trim(),
        description: data.description ?? null,
        geoLat: data.geoLat ?? null,
        geoLon: data.geoLon ?? null,
        teamId: data.teamId ?? null,
        isDefault: data.isDefault ?? false,
        isActive: true,
      },
    })

    return { success: true, meetingPointId: meetingPoint.id }
  } catch (error) {
    console.error('Ошибка создания точки встречи:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Обновление точки встречи ===

export interface UpdateMeetingPointData {
  name?: string
  address?: string
  description?: string | null
  geoLat?: string | null
  geoLon?: string | null
  teamId?: string | null
  isDefault?: boolean
  isActive?: boolean
}

export async function updateMeetingPointAction(
  meetingPointId: string,
  data: UpdateMeetingPointData
): Promise<UpdateMeetingPointResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const meetingPoint = await db.practiceMeetingPoint.findUnique({
      where: { id: meetingPointId },
      select: { id: true, organizationId: true },
    })

    if (!meetingPoint) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(meetingPoint.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Валидация
    if (data.name !== undefined && data.name.trim().length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Название не может быть пустым' }
    }

    if (data.address !== undefined && data.address.trim().length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Адрес не может быть пустым' }
    }

    // Если устанавливаем как точку по умолчанию, сбрасываем флаг у других
    if (data.isDefault === true) {
      await schoolDb.practiceMeetingPoint.updateMany({
        where: {
          organizationId: meetingPoint.organizationId,
          isDefault: true,
          id: { not: meetingPointId },
        },
        data: { isDefault: false },
      })
    }

    await schoolDb.practiceMeetingPoint.update({
      where: { id: meetingPointId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.address && { address: data.address.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.geoLat !== undefined && { geoLat: data.geoLat }),
        ...(data.geoLon !== undefined && { geoLon: data.geoLon }),
        ...(data.teamId !== undefined && { teamId: data.teamId }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка обновления точки встречи:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Деактивация точки встречи ===

export async function deactivateMeetingPointAction(meetingPointId: string): Promise<DeleteMeetingPointResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const meetingPoint = await db.practiceMeetingPoint.findUnique({
      where: { id: meetingPointId },
      include: {
        instructors: true,
      },
    })

    if (!meetingPoint) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(meetingPoint.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Проверяем привязанных инструкторов
    if (meetingPoint.instructors.length > 0) {
      return {
        success: false,
        error: 'HAS_INSTRUCTORS',
        message: `К точке привязано ${meetingPoint.instructors.length} инструкторов. Отвяжите их перед деактивацией.`,
      }
    }

    await schoolDb.practiceMeetingPoint.update({
      where: { id: meetingPointId },
      data: { isActive: false },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка деактивации точки встречи:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Установка точки по умолчанию ===

export async function setDefaultMeetingPointAction(meetingPointId: string): Promise<UpdateMeetingPointResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const meetingPoint = await db.practiceMeetingPoint.findUnique({
      where: { id: meetingPointId },
      select: { id: true, organizationId: true },
    })

    if (!meetingPoint) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(meetingPoint.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // ZenStack v3: $transaction не поддерживается напрямую, используем последовательные операции
    // Сбрасываем флаг у всех
    await schoolDb.practiceMeetingPoint.updateMany({
      where: { organizationId: meetingPoint.organizationId, isDefault: true },
      data: { isDefault: false },
    })
    // Устанавливаем флаг у выбранной
    await schoolDb.practiceMeetingPoint.update({
      where: { id: meetingPointId },
      data: { isDefault: true },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка установки точки по умолчанию:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
