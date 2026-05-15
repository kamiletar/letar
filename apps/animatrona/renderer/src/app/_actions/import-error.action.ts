'use server'

/**
 * Server Actions для CRUD операций с ImportError
 * Фиксация и управление ошибками импорта дорожек
 */

import type { Episode, ImportError } from '@/generated/prisma'
import { prisma } from '@/lib/db'

/** ImportError с номером эпизода */
export type ImportErrorWithEpisode = ImportError & {
  episode: Pick<Episode, 'number'>
}

// === CREATE ===

/**
 * Создать запись об ошибке импорта
 */
export async function createImportError(data: {
  episodeId: string
  trackType: string
  streamIndex: number
  language?: string | null
  title?: string | null
  error: string
  stage: string
  sourcePath?: string | null
}): Promise<ImportError> {
  return prisma.importError.create({ data })
}

// === READ ===

/**
 * Получить ошибки импорта для аниме (через эпизоды)
 */
export async function getImportErrors(animeId: string): Promise<ImportErrorWithEpisode[]> {
  return prisma.importError.findMany({
    where: {
      episode: { animeId },
      resolved: false,
    },
    include: {
      episode: {
        select: { number: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// === UPDATE ===

/**
 * Пометить ошибку как исправленную
 */
export async function resolveImportError(id: string): Promise<void> {
  await prisma.importError.update({
    where: { id },
    data: { resolved: true },
  })
}

/**
 * Пометить все ошибки эпизодов как исправленные (при восстановлении)
 */
export async function resolveImportErrorsForAnime(animeId: string): Promise<{ count: number }> {
  return prisma.importError.updateMany({
    where: {
      episode: { animeId },
      resolved: false,
    },
    data: { resolved: true },
  })
}

// === DELETE ===

/**
 * Удалить исправленные ошибки для аниме
 */
export async function deleteResolvedErrors(animeId: string): Promise<{ count: number }> {
  return prisma.importError.deleteMany({
    where: {
      episode: { animeId },
      resolved: true,
    },
  })
}
