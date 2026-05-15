'use server'

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import type { ActionResult } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const TeamSchema = z
  .object({
    name: z.string().min(1, 'Введите название'),
    slug: z
      .string()
      .min(1, 'Введите slug')
      .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
    cityId: z.string().min(1, 'Выберите город'),
    homeVenueId: z.string().optional(),
    telegramLink: z.string().optional(),
    description: z.string().optional(),
  })
  .strip()

export interface TeamItem {
  id: string
  name: string
  slug: string
  city: { id: string; name: string; slug: string }
  homeVenue: { id: string; name: string } | null
  _count: { teamSeasons: number }
}

export const getTeamsAction = adminGuard(async (): Promise<ActionResult<TeamItem[]>> => {
  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' },
    include: {
      city: { select: { id: true, name: true, slug: true } },
      homeVenue: { select: { id: true, name: true } },
      _count: { select: { teamSeasons: true } },
    },
  })

  return { success: true, data: teams }
})

export const createTeamAction = adminGuard(async (formData: unknown): Promise<ActionResult<{ id: string }>> => {
  const parsed = TeamSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    const { homeVenueId, ...rest } = parsed.data
    const team = await prisma.team.create({
      data: { ...rest, homeVenueId: homeVenueId || null },
    })
    revalidatePath('/admin/teams')
    return { success: true, data: { id: team.id } }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique')) {
      return { success: false, error: 'Команда с таким slug уже существует' }
    }
    return { success: false, error: 'Ошибка создания команды' }
  }
})

export const updateTeamAction = adminGuard(async (id: string, formData: unknown): Promise<ActionResult> => {
  const parsed = TeamSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    const { homeVenueId, ...rest } = parsed.data
    await prisma.team.update({
      where: { id },
      data: { ...rest, homeVenueId: homeVenueId || null },
    })
    revalidatePath('/admin/teams')
    return { success: true, data: undefined }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique')) {
      return { success: false, error: 'Команда с таким slug уже существует' }
    }
    return { success: false, error: 'Ошибка обновления команды' }
  }
})

export const deleteTeamAction = adminGuard(async (id: string): Promise<ActionResult> => {
  try {
    await prisma.team.delete({ where: { id } })
    revalidatePath('/admin/teams')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Невозможно удалить команду — есть связанные данные' }
  }
})
