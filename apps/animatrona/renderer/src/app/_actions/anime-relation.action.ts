'use server'

/**
 * Server Actions для CRUD операций с AnimeRelation
 * Связи между аниме (продолжения, спин-оффы и т.д.)
 */

import type { AnimeRelation, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить список связей
 */
export async function findManyAnimeRelations(args?: Prisma.AnimeRelationFindManyArgs): Promise<AnimeRelation[]> {
  return prisma.animeRelation.findMany(args)
}

/**
 * Получить связь по ID
 */
export async function findUniqueAnimeRelation(
  id: string,
  include?: Prisma.AnimeRelationInclude
): Promise<AnimeRelation | null> {
  return prisma.animeRelation.findUnique({
    where: { id },
    include,
  })
}

/**
 * Получить связи аниме
 */
export async function findAnimeRelationsByAnimeId(
  animeId: string,
  include?: Prisma.AnimeRelationInclude
): Promise<AnimeRelation[]> {
  return prisma.animeRelation.findMany({
    where: { sourceAnimeId: animeId },
    include,
  })
}

// === CREATE ===

/**
 * Создать связь
 */
export async function createAnimeRelation(data: Prisma.AnimeRelationUncheckedCreateInput): Promise<AnimeRelation> {
  return prisma.animeRelation.create({ data })
}

/**
 * Создать несколько связей
 */
export async function createManyAnimeRelations(
  data: Prisma.AnimeRelationCreateManyInput[]
): Promise<{ count: number }> {
  return prisma.animeRelation.createMany({ data })
}

/**
 * Синхронизировать связи для аниме (удаляет старые и создаёт новые)
 * Безопасно для повторных вызовов, не вызывает Unique constraint error
 */
export async function syncAnimeRelations(
  sourceAnimeId: string,
  relations: Omit<Prisma.AnimeRelationCreateManyInput, 'sourceAnimeId'>[]
): Promise<{ count: number }> {
  // Удаляем все существующие связи для этого аниме
  await prisma.animeRelation.deleteMany({
    where: { sourceAnimeId },
  })

  // Создаём новые связи
  const data = relations.map((r) => ({
    ...r,
    sourceAnimeId,
  }))

  return prisma.animeRelation.createMany({ data })
}

// === UPDATE ===

/**
 * Обновить связь
 */
export async function updateAnimeRelation(id: string, data: Prisma.AnimeRelationUpdateInput): Promise<AnimeRelation> {
  return prisma.animeRelation.update({
    where: { id },
    data,
  })
}

// === DELETE ===

/**
 * Удалить связь
 */
export async function deleteAnimeRelation(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.animeRelation.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Удалить несколько связей
 */
export async function deleteManyAnimeRelations(where: Prisma.AnimeRelationWhereInput): Promise<{ count: number }> {
  return prisma.animeRelation.deleteMany({ where })
}
