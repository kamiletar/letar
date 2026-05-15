'use server'

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import type { ActionResult } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const SeasonSchema = z
  .object({
    name: z.string().min(1, 'Введите название'),
    slug: z
      .string()
      .min(1, 'Введите slug')
      .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
    cityId: z.string().min(1, 'Выберите город'),
    status: z.enum(['UPCOMING', 'ACTIVE', 'FINISHED']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .strip()
  .refine((d) => !d.startDate || !d.endDate || new Date(d.startDate) < new Date(d.endDate), {
    message: 'Дата начала должна быть раньше даты окончания',
    path: ['endDate'],
  })

const LeagueSchema = z
  .object({
    name: z.string().min(1, 'Введите название лиги'),
    order: z.number().int().min(1),
  })
  .strip()

export interface SeasonItem {
  id: string
  name: string
  slug: string
  status: string
  city: { id: string; name: string }
  _count: { leagues: number; teamSeasons: number }
}

export interface LeagueItem {
  id: string
  name: string
  order: number
  _count: { teamSeasons: number; matches: number }
}

export const getSeasonsAction = adminGuard(async (): Promise<ActionResult<SeasonItem[]>> => {
  const seasons = await prisma.season.findMany({
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    include: {
      city: { select: { id: true, name: true } },
      _count: { select: { leagues: true, teamSeasons: true } },
    },
  })

  return { success: true, data: seasons }
})

export const createSeasonAction = adminGuard(async (formData: unknown): Promise<ActionResult<{ id: string }>> => {
  const parsed = SeasonSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    const { startDate, endDate, ...rest } = parsed.data
    const season = await prisma.season.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })
    revalidatePath('/admin/seasons')
    return { success: true, data: { id: season.id } }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique')) {
      return { success: false, error: 'Сезон с таким slug уже существует' }
    }
    return { success: false, error: 'Ошибка создания сезона' }
  }
})

export const updateSeasonAction = adminGuard(async (id: string, formData: unknown): Promise<ActionResult> => {
  const parsed = SeasonSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    const { startDate, endDate, ...rest } = parsed.data
    await prisma.season.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })
    revalidatePath('/admin/seasons')
    return { success: true, data: undefined }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique')) {
      return { success: false, error: 'Сезон с таким slug уже существует' }
    }
    return { success: false, error: 'Ошибка обновления сезона' }
  }
})

export const deleteSeasonAction = adminGuard(async (id: string): Promise<ActionResult> => {
  try {
    await prisma.season.delete({ where: { id } })
    revalidatePath('/admin/seasons')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Невозможно удалить сезон — есть связанные данные' }
  }
})

// === Лиги внутри сезона ===

export const getLeaguesAction = adminGuard(async (seasonId: string): Promise<ActionResult<LeagueItem[]>> => {
  const leagues = await prisma.league.findMany({
    where: { seasonId },
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { teamSeasons: true, matches: true } },
    },
  })

  return { success: true, data: leagues }
})

export const createLeagueAction = adminGuard(
  async (seasonId: string, formData: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = LeagueSchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
    }

    try {
      const league = await prisma.league.create({
        data: { ...parsed.data, seasonId },
      })
      revalidatePath(`/admin/seasons/${seasonId}`)
      return { success: true, data: { id: league.id } }
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('Unique')) {
        return { success: false, error: 'Лига с таким названием уже существует в этом сезоне' }
      }
      return { success: false, error: 'Ошибка создания лиги' }
    }
  }
)

export const deleteLeagueAction = adminGuard(async (id: string, seasonId: string): Promise<ActionResult> => {
  try {
    await prisma.league.delete({ where: { id } })
    revalidatePath(`/admin/seasons/${seasonId}`)
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Невозможно удалить лигу — есть связанные данные' }
  }
})

// === Трансферное окно ===

export const toggleTransferWindowAction = adminGuard(async (seasonId: string, open: boolean): Promise<ActionResult> => {
  await prisma.season.update({
    where: { id: seasonId },
    data: { transferWindowOpen: open },
  })

  revalidatePath(`/admin/seasons/${seasonId}`)
  return { success: true, data: undefined }
})
