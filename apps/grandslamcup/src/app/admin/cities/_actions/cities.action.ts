'use server'

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import type { ActionResult } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Схемы ===

const CitySchema = z
  .object({
    name: z.string().min(1, 'Введите название города'),
    slug: z
      .string()
      .min(1, 'Введите slug')
      .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
    telegramChatId: z.string().max(100).nullable().optional(),
  })
  .strip()

// === Типы ===

export interface CityItem {
  id: string
  name: string
  slug: string
  _count: { venues: number; teams: number; seasons: number }
}

// === Actions ===

export const getCitiesAction = adminGuard(async (): Promise<ActionResult<CityItem[]>> => {
  const cities = await prisma.city.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { venues: true, teams: true, seasons: true } },
    },
  })

  return { success: true, data: cities }
})

export const createCityAction = adminGuard(async (formData: unknown): Promise<ActionResult<{ id: string }>> => {
  const parsed = CitySchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    const city = await prisma.city.create({ data: parsed.data })
    revalidatePath('/admin/cities')
    return { success: true, data: { id: city.id } }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique')) {
      return { success: false, error: 'Город с таким slug уже существует' }
    }
    return { success: false, error: 'Ошибка создания города' }
  }
})

export const updateCityAction = adminGuard(async (id: string, formData: unknown): Promise<ActionResult> => {
  const parsed = CitySchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    await prisma.city.update({ where: { id }, data: parsed.data })
    revalidatePath('/admin/cities')
    return { success: true, data: undefined }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique')) {
      return { success: false, error: 'Город с таким slug уже существует' }
    }
    return { success: false, error: 'Ошибка обновления города' }
  }
})

export const deleteCityAction = adminGuard(async (id: string): Promise<ActionResult> => {
  try {
    await prisma.city.delete({ where: { id } })
    revalidatePath('/admin/cities')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Невозможно удалить город — есть связанные данные' }
  }
})
