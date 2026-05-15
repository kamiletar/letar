'use server'

/**
 * Server Actions для CRUD операций с Episode
 */

import type { Episode, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить список эпизодов
 */
export async function findManyEpisodes(args?: Prisma.EpisodeFindManyArgs): Promise<Episode[]> {
  return prisma.episode.findMany(args)
}

/**
 * Получить эпизод по ID
 */
export async function findUniqueEpisode(id: string, include?: Prisma.EpisodeInclude): Promise<Episode | null> {
  return prisma.episode.findUnique({
    where: { id },
    include,
  })
}

/**
 * Получить эпизоды аниме
 */
export async function findEpisodesByAnimeId(animeId: string, include?: Prisma.EpisodeInclude): Promise<Episode[]> {
  return prisma.episode.findMany({
    where: { animeId },
    include,
    orderBy: { number: 'asc' },
  })
}

/**
 * Получить эпизод по номеру
 */
export async function findEpisodeByNumber(
  animeId: string,
  number: number,
  include?: Prisma.EpisodeInclude
): Promise<Episode | null> {
  return prisma.episode.findUnique({
    where: {
      animeId_number: { animeId, number },
    },
    include,
  })
}

// === CREATE ===

/**
 * Создать новый эпизод
 */
export async function createEpisode(data: Prisma.EpisodeUncheckedCreateInput): Promise<Episode> {
  return prisma.episode.create({ data })
}

/**
 * Создать или обновить эпизод по animeId + number
 */
export async function upsertEpisode(data: Prisma.EpisodeUncheckedCreateInput): Promise<Episode> {
  const { animeId, number, ...rest } = data

  if (!animeId || number === undefined) {
    throw new Error('animeId и number обязательны для upsertEpisode')
  }

  return prisma.episode.upsert({
    where: {
      animeId_number: { animeId, number },
    },
    create: data,
    update: rest,
  })
}

/**
 * Создать несколько эпизодов
 */
export async function createManyEpisodes(data: Prisma.EpisodeCreateManyInput[]): Promise<{ count: number }> {
  return prisma.episode.createMany({ data })
}

// === UPDATE ===

/**
 * Обновить эпизод
 */
export async function updateEpisode(id: string, data: Prisma.EpisodeUpdateInput): Promise<Episode> {
  return prisma.episode.update({
    where: { id },
    data,
  })
}

// === DELETE ===

/**
 * Удалить эпизод
 */
export async function deleteEpisode(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.episode.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Удалить все эпизоды аниме
 */
export async function deleteEpisodesByAnimeId(animeId: string): Promise<{ count: number }> {
  return prisma.episode.deleteMany({ where: { animeId } })
}

// === COUNTS ===

/**
 * Получить количество эпизодов
 */
export async function countEpisodes(where?: Prisma.EpisodeWhereInput): Promise<number> {
  return prisma.episode.count({ where })
}

/**
 * Получить количество эпизодов аниме
 */
export async function countEpisodesByAnimeId(animeId: string): Promise<number> {
  return prisma.episode.count({ where: { animeId } })
}
