'use server'

/**
 * Server Actions для CRUD операций с Franchise
 * Франшизы (серии связанных аниме)
 *
 * Логика: франшиза определяется через REST API /api/animes/{id}/franchise
 * Все аниме в одном графе = одна франшиза
 * rootShikimoriId = минимальный shikimoriId из графа (стабильный ключ)
 * Граф хранится в IPFS как FranchiseGraphDocument, в БД только graphCid
 */

import type { Franchise, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить список франшиз
 */
export async function findManyFranchises(args?: Prisma.FranchiseFindManyArgs): Promise<Franchise[]> {
  return prisma.franchise.findMany(args)
}

/**
 * Получить франшизу по ID
 */
export async function findUniqueFranchise(id: string, include?: Prisma.FranchiseInclude): Promise<Franchise | null> {
  return prisma.franchise.findUnique({
    where: { id },
    include,
  })
}

// === CREATE ===

/**
 * Создать франшизу
 */
export async function createFranchise(data: Prisma.FranchiseCreateInput): Promise<Franchise> {
  return prisma.franchise.create({ data })
}

/**
 * Создать или найти франшизу по rootShikimoriId (стабильный ключ)
 * Используется при синхронизации связей — если франшиза уже существует, возвращает её
 */
export async function upsertFranchiseByRootShikimoriId(
  rootShikimoriId: number,
  data: { name: string },
): Promise<Franchise> {
  return prisma.franchise.upsert({
    where: { rootShikimoriId },
    create: {
      name: data.name,
      rootShikimoriId,
    },
    update: {
      // Не обновляем ничего — просто возвращаем существующую
    },
  })
}

// === UPDATE ===

/**
 * Обновить франшизу
 */
export async function updateFranchise(id: string, data: Prisma.FranchiseUpdateInput): Promise<Franchise> {
  return prisma.franchise.update({
    where: { id },
    data,
  })
}

// === DELETE ===

/**
 * Удалить франшизу
 */
export async function deleteFranchise(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.franchise.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// === GRAPH SYNC ===

/**
 * Найти франшизу по rootShikimoriId (стабильный ключ)
 */
export async function findFranchiseByRootShikimoriId(
  rootShikimoriId: number,
  include?: Prisma.FranchiseInclude,
): Promise<Franchise | null> {
  return prisma.franchise.findUnique({
    where: { rootShikimoriId },
    include,
  })
}

/**
 * Синхронизировать франшизу из графа REST API
 *
 * Логика:
 * 1. rootShikimoriId = минимальный shikimoriId из графа (стабильный ключ)
 * 2. Upsert франшизу по rootShikimoriId
 * 3. Привязать все аниме из графа к этой франшизе
 *
 * @param graphCid - CID FranchiseGraphDocument в IPFS (null если ещё не загружен)
 * @param rootShikimoriId - Минимальный shikimoriId (уже вычислен в IPC)
 * @param franchiseName - Название франшизы (уже вычислено в IPC)
 * @param shikimoriIds - Все shikimoriId из графа (для привязки аниме)
 */
export async function syncFranchiseFromGraph(
  graphCid: string | null,
  rootShikimoriId: number,
  franchiseName: string,
  shikimoriIds: number[],
): Promise<{ franchise: Franchise; updatedAnimeCount: number }> {
  // Upsert франшизу по rootShikimoriId
  const franchise = await prisma.franchise.upsert({
    where: { rootShikimoriId },
    create: {
      name: franchiseName,
      rootShikimoriId,
      graphCid,
      graphUpdatedAt: new Date(),
    },
    update: {
      name: franchiseName,
      graphCid,
      graphUpdatedAt: new Date(),
    },
  })

  // Привязать все аниме из графа к этой франшизе
  const result = await prisma.anime.updateMany({
    where: { shikimoriId: { in: shikimoriIds } },
    data: { franchiseId: franchise.id },
  })

  return {
    franchise,
    updatedAnimeCount: result.count,
  }
}

/**
 * Обновить graphCid франшизы (после загрузки графа в IPFS)
 */
export async function updateFranchiseGraphCid(
  franchiseId: string,
  graphCid: string,
  franchiseName?: string,
): Promise<Franchise> {
  return prisma.franchise.update({
    where: { id: franchiseId },
    data: {
      ...(franchiseName && { name: franchiseName }),
      graphCid,
      graphUpdatedAt: new Date(),
    },
  })
}

/**
 * Получить франшизы которые нужно обновить (graphUpdatedAt старше недели)
 */
export async function findStaleGraphFranchises(limit = 10): Promise<Franchise[]> {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  return prisma.franchise.findMany({
    where: {
      rootShikimoriId: { not: null },
      OR: [{ graphUpdatedAt: null }, { graphUpdatedAt: { lt: oneWeekAgo } }],
    },
    take: limit,
    orderBy: { graphUpdatedAt: 'asc' },
  })
}

/**
 * Получить CID графа франшизы из БД
 */
export async function getFranchiseGraphCid(franchiseId: string): Promise<string | null> {
  const franchise = await prisma.franchise.findUnique({
    where: { id: franchiseId },
    select: { graphCid: true },
  })

  return franchise?.graphCid ?? null
}
