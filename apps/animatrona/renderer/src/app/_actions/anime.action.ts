'use server'

/**
 * Server Actions для CRUD операций с Anime
 */

import type { Anime, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить список аниме
 */
export async function findManyAnime(args?: Prisma.AnimeFindManyArgs): Promise<Anime[]> {
  return prisma.anime.findMany(args)
}

/**
 * Получить аниме по ID
 */
export async function findUniqueAnime(id: string, include?: Prisma.AnimeInclude): Promise<Anime | null> {
  return prisma.anime.findUnique({
    where: { id },
    include,
  })
}

/**
 * Получить аниме по Shikimori ID
 */
export async function findAnimeByShikimoriId(
  shikimoriId: number,
  include?: Prisma.AnimeInclude
): Promise<Anime | null> {
  return prisma.anime.findUnique({
    where: { shikimoriId },
    include,
  })
}

/** Минимальные поля для результата поиска */
export type AnimeSearchResult = Pick<Anime, 'id' | 'name' | 'originalName' | 'year' | 'status' | 'shikimoriId'>

/**
 * Поиск аниме по названию
 * Оптимизировано: возвращает только необходимые поля вместо всей записи
 */
export async function searchAnime(query: string, take = 20): Promise<AnimeSearchResult[]> {
  return prisma.anime.findMany({
    where: {
      OR: [{ name: { contains: query } }, { originalName: { contains: query } }],
    },
    select: {
      id: true,
      name: true,
      originalName: true,
      year: true,
      status: true,
      shikimoriId: true,
    },
    take,
    orderBy: { name: 'asc' },
  })
}

// === CREATE ===

/**
 * Создать новое аниме
 */
export async function createAnime(data: Prisma.AnimeUncheckedCreateInput): Promise<Anime> {
  return prisma.anime.create({ data })
}

/**
 * Upsert аниме по shikimoriId — создаёт новое или возвращает существующее
 * При повторном импорте того же аниме обновляет данные
 */
export async function upsertAnimeByShikimoriId(data: Prisma.AnimeUncheckedCreateInput): Promise<Anime> {
  try {
    if (!data.shikimoriId) {
      // Без shikimoriId делаем обычный create
      return await prisma.anime.create({ data })
    }

    return await prisma.anime.upsert({
      where: { shikimoriId: data.shikimoriId },
      create: data,
      update: {
        // Обновляем только метаданные, не трогаем posterId и folderPath
        name: data.name,
        originalName: data.originalName,
        year: data.year,
        status: data.status,
        episodeCount: data.episodeCount,
        rating: data.rating,
      },
    })
  } catch (error) {
    // Логируем реальную ошибку
    console.error('[upsertAnimeByShikimoriId] Error:', error)
    // Бросаем ошибку с понятным сообщением
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка при создании аниме'
    throw new Error(`Ошибка создания аниме: ${message}`)
  }
}

// === UPDATE ===

/**
 * Обновить аниме
 */
export async function updateAnime(id: string, data: Prisma.AnimeUncheckedUpdateInput): Promise<Anime> {
  return prisma.anime.update({
    where: { id },
    data,
  })
}

/**
 * Обновить постер аниме
 */
export async function updateAnimePoster(id: string, posterId: string | null): Promise<Anime> {
  return prisma.anime.update({
    where: { id },
    data: { posterId },
  })
}

/**
 * Обновить путь к папке
 */
export async function updateAnimeFolderPath(id: string, folderPath: string | null): Promise<Anime> {
  return prisma.anime.update({
    where: { id },
    data: { folderPath },
  })
}

// === DELETE ===

/**
 * Удалить аниме
 */
export async function deleteAnime(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.anime.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// === COUNTS ===

/**
 * Получить количество аниме
 */
export async function countAnime(where?: Prisma.AnimeWhereInput): Promise<number> {
  return prisma.anime.count({ where })
}

// === LIBRARY CHECK ===

/**
 * Информация о существующем аниме в библиотеке
 */
export interface ExistingAnimeInfo {
  id: string
  name: string
  episodeCount: number
}

/** Результат проверки локальных аниме (сериализуемый) */
export type ExistingAnimeMap = Record<number, ExistingAnimeInfo>

/**
 * Проверить какие аниме из списка shikimoriId уже есть в библиотеке
 * Используется для показа бейджа "В библиотеке" при поиске
 *
 * @returns Record<shikimoriId, ExistingAnimeInfo> (сериализуемый объект для Server Actions)
 */
export async function checkExistingAnimeByShikimoriIds(shikimoriIds: number[]): Promise<ExistingAnimeMap> {
  if (shikimoriIds.length === 0) {
    return {}
  }

  const existingAnime = await prisma.anime.findMany({
    where: { shikimoriId: { in: shikimoriIds } },
    select: {
      shikimoriId: true,
      id: true,
      name: true,
      _count: { select: { episodes: true } },
    },
  })

  const result: ExistingAnimeMap = {}
  for (const anime of existingAnime) {
    if (anime.shikimoriId) {
      result[anime.shikimoriId] = {
        id: anime.id,
        name: anime.name,
        episodeCount: anime._count.episodes,
      }
    }
  }

  return result
}

// === FRANCHISE HELPERS ===

/**
 * Получить все shikimoriId аниме в библиотеке
 * Используется для выделения аниме на графе франшизы
 */
export async function getLibraryShikimoriIds(): Promise<number[]> {
  const animes = await prisma.anime.findMany({
    where: { shikimoriId: { not: null } },
    select: { shikimoriId: true },
  })

  return animes.map((a) => a.shikimoriId).filter((id): id is number => id !== null)
}

/**
 * Получить маппинг shikimoriId → id для всех аниме в библиотеке
 * Используется для навигации по франшизе без дополнительных запросов
 */
export async function getLibraryShikimoriMap(): Promise<Array<{ shikimoriId: number; id: string }>> {
  const animes = await prisma.anime.findMany({
    where: { shikimoriId: { not: null } },
    select: { id: true, shikimoriId: true },
  })

  return animes.filter((a): a is { id: string; shikimoriId: number } => a.shikimoriId !== null)
}

/**
 * Найти существующую франшизу среди связанных аниме по их shikimoriId
 * Используется при синхронизации связей — если связанное аниме уже в библиотеке
 * и имеет франшизу, возвращаем её ID для объединения
 */
export async function findExistingFranchiseByRelatedShikimoriIds(shikimoriIds: number[]): Promise<string | null> {
  if (shikimoriIds.length === 0) {
    return null
  }

  // Ищем первое аниме с франшизой среди связанных
  const animeWithFranchise = await prisma.anime.findFirst({
    where: {
      shikimoriId: { in: shikimoriIds },
      franchiseId: { not: null },
    },
    select: { franchiseId: true },
  })

  return animeWithFranchise?.franchiseId ?? null
}
