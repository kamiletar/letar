'use server'

/**
 * Server Actions для CRUD операций с EncodingProfile
 * Заменяет ZenStack hooks для работы с профилями кодирования
 */

import type { EncodingProfile, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить список профилей кодирования
 */
export async function findManyEncodingProfiles(args?: Prisma.EncodingProfileFindManyArgs): Promise<EncodingProfile[]> {
  return prisma.encodingProfile.findMany(args)
}

/**
 * Получить профиль по ID
 */
export async function findUniqueEncodingProfile(
  id: string,
  include?: Prisma.EncodingProfileInclude
): Promise<EncodingProfile | null> {
  return prisma.encodingProfile.findUnique({
    where: { id },
    include,
  })
}

/**
 * Получить первый профиль по условию (для профиля по умолчанию)
 */
export async function findFirstEncodingProfile(
  args?: Prisma.EncodingProfileFindFirstArgs
): Promise<EncodingProfile | null> {
  return prisma.encodingProfile.findFirst(args)
}

/**
 * Получить профиль по умолчанию
 */
export async function getDefaultEncodingProfile(): Promise<EncodingProfile | null> {
  return prisma.encodingProfile.findFirst({
    where: { isDefault: true },
    orderBy: { createdAt: 'desc' },
  })
}

// === CREATE ===

/**
 * Создать новый профиль кодирования
 */
export async function createEncodingProfile(data: Prisma.EncodingProfileCreateInput): Promise<EncodingProfile> {
  // Если новый профиль отмечен как default, сбрасываем флаг у остальных
  if (data.isDefault) {
    await prisma.encodingProfile.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    })
  }

  return prisma.encodingProfile.create({ data })
}

// === UPDATE ===

/**
 * Обновить профиль кодирования
 */
export async function updateEncodingProfile(
  id: string,
  data: Prisma.EncodingProfileUpdateInput
): Promise<EncodingProfile> {
  // Если профиль становится default, сбрасываем флаг у остальных
  if (data.isDefault === true) {
    await prisma.encodingProfile.updateMany({
      where: { id: { not: id }, isDefault: true },
      data: { isDefault: false },
    })
  }

  return prisma.encodingProfile.update({
    where: { id },
    data,
  })
}

/**
 * Установить профиль по умолчанию
 */
export async function setDefaultEncodingProfile(id: string): Promise<EncodingProfile> {
  // Сбрасываем флаг у всех профилей
  await prisma.encodingProfile.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  })

  // Устанавливаем новый профиль по умолчанию
  return prisma.encodingProfile.update({
    where: { id },
    data: { isDefault: true },
  })
}

// === DELETE ===

/**
 * Удалить профиль кодирования
 * Нельзя удалять встроенные профили
 */
export async function deleteEncodingProfile(id: string): Promise<{ success: boolean; error?: string }> {
  const profile = await prisma.encodingProfile.findUnique({ where: { id } })

  if (!profile) {
    return { success: false, error: 'Профиль не найден' }
  }

  if (profile.isBuiltIn) {
    return { success: false, error: 'Нельзя удалить встроенный профиль' }
  }

  await prisma.encodingProfile.delete({ where: { id } })
  return { success: true }
}

// === RESET ===

import { type BuiltInProfile, getBuiltInProfiles } from '../../../../shared/encoding-profiles'
import type { GpuGeneration } from '../../../../shared/types'

/**
 * Сбросить встроенный профиль на оригинальные значения
 *
 * Ищет профиль по имени во всех наборах поколений GPU,
 * чтобы работать независимо от текущего оборудования.
 */
export async function resetBuiltInProfile(id: string, generation?: GpuGeneration): Promise<EncodingProfile | null> {
  const profile = await prisma.encodingProfile.findUnique({ where: { id } })

  if (!profile || !profile.isBuiltIn) {
    return null
  }

  // Ищем оригинальные данные — в наборе указанного поколения или во всех
  const generations: GpuGeneration[] = generation ? [generation] : ['blackwell', 'ada', 'ampere', 'turing', 'none']

  let originalData: BuiltInProfile | undefined
  for (const gen of generations) {
    originalData = getBuiltInProfiles(gen).find((p) => p.name === profile.name)
    if (originalData) {
      break
    }
  }

  if (!originalData) {
    return null
  }

  // Сбрасываем на оригинальные значения (сохраняем isDefault текущий)
  const { name: _name, isBuiltIn: _isBuiltIn, isDefault: _isDefault, ...resetData } = originalData

  return prisma.encodingProfile.update({
    where: { id },
    data: resetData,
  })
}

// === DUPLICATE ===

/**
 * Дублировать профиль (для создания на основе существующего)
 */
export async function duplicateEncodingProfile(id: string, newName?: string): Promise<EncodingProfile> {
  const source = await prisma.encodingProfile.findUnique({ where: { id } })

  if (!source) {
    throw new Error('Исходный профиль не найден')
  }

  // Создаём копию без id, timestamps и флагов встроенного/по умолчанию
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    isBuiltIn: _isBuiltIn,
    isDefault: _isDefault,
    ...profileData
  } = source

  return prisma.encodingProfile.create({
    data: {
      ...profileData,
      name: newName ?? `${source.name} (копия)`,
      isBuiltIn: false,
      isDefault: false,
    },
  })
}
