'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { generateNumerologyProfileData } from '@/lib/utils/numerology'
import { revalidatePath } from 'next/cache'
import {
  type BodyProfileFormData,
  BodyProfileFormSchema,
  type EnergyProfileFormData,
  EnergyProfileFormSchema,
  type NeuroPsychProfileFormData,
  NeuroPsychProfileFormSchema,
  type NumerologyProfileFormData,
  NumerologyProfileFormSchema,
  type StyleProfileFormData,
  StyleProfileFormSchema,
} from '../_schemas/profile-forms.schema'

interface ProfileActionResult {
  success: boolean
  error?: string
}

/**
 * ОБЩАЯ ФУНКЦИЯ ВАЛИДАЦИИ ДЛЯ ВСЕХ PROFILE ACTIONS
 * Проверяет аутентификацию и роль пользователя
 */
async function validateSpecialistAccess() {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'SPECIALIST' && session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Specialist or Admin access required')
  }

  return { session, db: getEnhancedPrisma(session.user) }
}

// ============================================================================
// 1. НУМЕРОЛОГИЯ - Матрица судьбы
// ============================================================================

export async function upsertNumerologyProfile(data: NumerologyProfileFormData): Promise<ProfileActionResult> {
  const { db } = await validateSpecialistAccess()

  const parsed = NumerologyProfileFormSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные профиля' }
  }

  try {
    const { clientId, ...profileData } = parsed.data

    // Проверяем, что клиент принадлежит этому специалисту
    const client = await db.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return { success: false, error: 'Клиент не найден' }
    }

    // Upsert профиль
    await db.numerologyProfile.upsert({
      where: { clientId },
      update: profileData,
      create: {
        clientId,
        ...profileData,
      },
    })

    revalidatePath(`/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to save numerology profile:', error)
    return { success: false, error: 'Не удалось сохранить профиль. Попробуйте еще раз.' }
  }
}

/**
 * Автоматическая генерация нумерологического профиля из даты рождения клиента
 */
export async function generateNumerologyProfileFromBirthdate(clientId: string) {
  const { db } = await validateSpecialistAccess()

  try {
    // Получаем клиента с датой рождения
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { birthdate: true },
    })

    if (!client) {
      throw new Error('Client not found')
    }

    if (!client.birthdate) {
      throw new Error('Дата рождения клиента не указана. Добавьте дату рождения в профиль клиента.')
    }

    // Генерируем данные нумерологического профиля
    const numerologyData = generateNumerologyProfileData(client.birthdate)

    // Создаем или обновляем профиль
    await db.numerologyProfile.upsert({
      where: { clientId },
      update: numerologyData,
      create: {
        clientId,
        ...numerologyData,
      },
    })

    revalidatePath(`/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to generate numerology profile:', error)
    throw error
  }
}

// ============================================================================
// 2. НЕЙРОПСИХОЛОГИЯ - Паттерны поведения
// ============================================================================

export async function upsertNeuroPsychProfile(data: NeuroPsychProfileFormData): Promise<ProfileActionResult> {
  const { db } = await validateSpecialistAccess()

  const parsed = NeuroPsychProfileFormSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные профиля' }
  }

  try {
    const { clientId, ...profileData } = parsed.data

    const client = await db.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return { success: false, error: 'Клиент не найден' }
    }

    await db.neuroPsychProfile.upsert({
      where: { clientId },
      update: profileData,
      create: {
        clientId,
        ...profileData,
      },
    })

    revalidatePath(`/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to save neuropsych profile:', error)
    return { success: false, error: 'Не удалось сохранить профиль. Попробуйте еще раз.' }
  }
}

// ============================================================================
// 3. ЭНЕРГЕТИКА - 7 чакр и энергетическая карта
// ============================================================================

export async function upsertEnergyProfile(data: EnergyProfileFormData): Promise<ProfileActionResult> {
  const { db } = await validateSpecialistAccess()

  const parsed = EnergyProfileFormSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные профиля' }
  }

  try {
    const { clientId, ...profileData } = parsed.data

    const client = await db.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return { success: false, error: 'Клиент не найден' }
    }

    await db.energyProfile.upsert({
      where: { clientId },
      update: profileData,
      create: {
        clientId,
        ...profileData,
      },
    })

    revalidatePath(`/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to save energy profile:', error)
    return { success: false, error: 'Не удалось сохранить профиль. Попробуйте еще раз.' }
  }
}

// ============================================================================
// 4. ТЕЛО - Телесная карта и психосоматика
// ============================================================================

export async function upsertBodyProfile(data: BodyProfileFormData): Promise<ProfileActionResult> {
  const { db } = await validateSpecialistAccess()

  const parsed = BodyProfileFormSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные профиля' }
  }

  try {
    const { clientId, ...profileData } = parsed.data

    const client = await db.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return { success: false, error: 'Клиент не найден' }
    }

    await db.bodyProfile.upsert({
      where: { clientId },
      update: profileData,
      create: {
        clientId,
        ...profileData,
      },
    })

    revalidatePath(`/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to save body profile:', error)
    return { success: false, error: 'Не удалось сохранить профиль. Попробуйте еще раз.' }
  }
}

// ============================================================================
// 5. СТИЛЬ - Цветотип и архетип
// ============================================================================

export async function upsertStyleProfile(data: StyleProfileFormData): Promise<ProfileActionResult> {
  const { db } = await validateSpecialistAccess()

  const parsed = StyleProfileFormSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные профиля' }
  }

  try {
    const { clientId, ...profileData } = parsed.data

    const client = await db.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return { success: false, error: 'Клиент не найден' }
    }

    await db.styleProfile.upsert({
      where: { clientId },
      update: profileData,
      create: {
        clientId,
        ...profileData,
      },
    })

    revalidatePath(`/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to save style profile:', error)
    return { success: false, error: 'Не удалось сохранить профиль. Попробуйте еще раз.' }
  }
}
