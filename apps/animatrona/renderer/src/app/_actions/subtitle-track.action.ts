'use server'

/**
 * Server Actions для CRUD операций с SubtitleTrack
 */

import type { Prisma, SubtitleTrack } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить список субтитров
 */
export async function findManySubtitleTracks(args?: Prisma.SubtitleTrackFindManyArgs): Promise<SubtitleTrack[]> {
  return prisma.subtitleTrack.findMany(args)
}

/**
 * Получить субтитры по ID
 */
export async function findUniqueSubtitleTrack(
  id: string,
  include?: Prisma.SubtitleTrackInclude
): Promise<SubtitleTrack | null> {
  return prisma.subtitleTrack.findUnique({
    where: { id },
    include,
  })
}

// === CREATE ===

/**
 * Создать субтитры
 */
export async function createSubtitleTrack(data: Prisma.SubtitleTrackUncheckedCreateInput): Promise<SubtitleTrack> {
  return prisma.subtitleTrack.create({ data })
}

/**
 * Создать несколько субтитров
 */
export async function createManySubtitleTracks(
  data: Prisma.SubtitleTrackCreateManyInput[]
): Promise<{ count: number }> {
  return prisma.subtitleTrack.createMany({ data })
}

// === UPDATE ===

/**
 * Обновить субтитры
 */
export async function updateSubtitleTrack(id: string, data: Prisma.SubtitleTrackUpdateInput): Promise<SubtitleTrack> {
  return prisma.subtitleTrack.update({
    where: { id },
    data,
  })
}

// === DELETE ===

/**
 * Удалить субтитры
 */
export async function deleteSubtitleTrack(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.subtitleTrack.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Удалить субтитры эпизода
 */
export async function deleteSubtitleTracksByEpisodeId(episodeId: string): Promise<{ count: number }> {
  return prisma.subtitleTrack.deleteMany({ where: { episodeId } })
}

// === RESTORE ===

/**
 * Удалить сломанные субтитры (без fileCid) для аниме
 */
export async function deleteBrokenSubtitleTracks(animeId: string): Promise<{ count: number }> {
  return prisma.subtitleTrack.deleteMany({
    where: {
      episode: { animeId },
      fileCid: null,
    },
  })
}

// === BATCH DELETE ===

/**
 * Пакетное удаление субтитров по массиву ID
 */
export async function batchDeleteSubtitleTracks(trackIds: string[]): Promise<{ count: number }> {
  return prisma.subtitleTrack.deleteMany({
    where: { id: { in: trackIds } },
  })
}

// === BATCH UPDATE ===

/**
 * Пакетное обновление субтитров
 * Используется для массового изменения language/dubGroup
 */
export async function batchUpdateSubtitleTracks(
  trackIds: string[],
  data: { language?: string; dubGroup?: string | null }
): Promise<{ count: number }> {
  return prisma.subtitleTrack.updateMany({
    where: { id: { in: trackIds } },
    data,
  })
}
