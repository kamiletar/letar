'use server'

/**
 * Server Actions для CRUD операций с Season
 */

import type { Prisma, Season } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить список сезонов
 */
export async function findManySeasons(args?: Prisma.SeasonFindManyArgs): Promise<Season[]> {
  return prisma.season.findMany(args)
}

/**
 * Получить сезон по ID
 */
export async function findUniqueSeason(id: string, include?: Prisma.SeasonInclude): Promise<Season | null> {
  return prisma.season.findUnique({
    where: { id },
    include,
  })
}

// === CREATE ===

/**
 * Создать сезон
 */
export async function createSeason(data: Prisma.SeasonUncheckedCreateInput): Promise<Season> {
  return prisma.season.create({ data })
}

/**
 * Создать или обновить сезон (upsert)
 * Использует уникальный ключ (animeId, number)
 */
export async function upsertSeason(data: Prisma.SeasonUncheckedCreateInput & { number: number }): Promise<Season> {
  return prisma.season.upsert({
    where: {
      animeId_number: {
        animeId: data.animeId,
        number: data.number,
      },
    },
    create: data,
    update: {
      name: data.name,
      type: data.type,
    },
  })
}

// === UPDATE ===

/**
 * Обновить сезон
 */
export async function updateSeason(id: string, data: Prisma.SeasonUpdateInput): Promise<Season> {
  return prisma.season.update({
    where: { id },
    data,
  })
}

// === DELETE ===

/**
 * Удалить сезон
 */
export async function deleteSeason(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.season.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
