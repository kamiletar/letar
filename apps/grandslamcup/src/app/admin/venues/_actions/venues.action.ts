'use server'

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import type { ActionResult } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const VenueSchema = z
  .object({
    name: z.string().min(1, 'Введите название'),
    slug: z
      .string()
      .min(1, 'Введите slug')
      .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
    cityId: z.string().min(1, 'Выберите город'),
    address: z.string().optional(),
    telegramLink: z.string().optional(),
    websiteUrl: z.string().optional(),
    description: z.string().optional(),
  })
  .strip()

export interface VenueItem {
  id: string
  name: string
  slug: string
  address: string | null
  city: { id: string; name: string }
  _count: { teams: number; matches: number }
}

export const getVenuesAction = adminGuard(async (): Promise<ActionResult<VenueItem[]>> => {
  const venues = await prisma.venue.findMany({
    orderBy: { name: 'asc' },
    include: {
      city: { select: { id: true, name: true } },
      _count: { select: { teams: true, matches: true } },
    },
  })

  return { success: true, data: venues }
})

export const createVenueAction = adminGuard(async (formData: unknown): Promise<ActionResult<{ id: string }>> => {
  const parsed = VenueSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    const venue = await prisma.venue.create({ data: parsed.data })
    revalidatePath('/admin/venues')
    return { success: true, data: { id: venue.id } }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique')) {
      return { success: false, error: 'Площадка с таким slug уже существует' }
    }
    return { success: false, error: 'Ошибка создания площадки' }
  }
})

export const updateVenueAction = adminGuard(async (id: string, formData: unknown): Promise<ActionResult> => {
  const parsed = VenueSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    await prisma.venue.update({ where: { id }, data: parsed.data })
    revalidatePath('/admin/venues')
    return { success: true, data: undefined }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique')) {
      return { success: false, error: 'Площадка с таким slug уже существует' }
    }
    return { success: false, error: 'Ошибка обновления площадки' }
  }
})

export const deleteVenueAction = adminGuard(async (id: string): Promise<ActionResult> => {
  try {
    await prisma.venue.delete({ where: { id } })
    revalidatePath('/admin/venues')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Невозможно удалить площадку — есть связанные данные' }
  }
})
