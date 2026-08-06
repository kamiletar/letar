'use server'

/**
 * Server Actions для CRUD операций с AudioTrack
 */

import type { AudioTrack, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить список аудиодорожек
 */
export async function findManyAudioTracks(args?: Prisma.AudioTrackFindManyArgs): Promise<AudioTrack[]> {
  return prisma.audioTrack.findMany(args)
}

/**
 * Получить аудиодорожку по ID
 */
export async function findUniqueAudioTrack(id: string, include?: Prisma.AudioTrackInclude): Promise<AudioTrack | null> {
  return prisma.audioTrack.findUnique({
    where: { id },
    include,
  })
}

// === CREATE ===

/**
 * Создать аудиодорожку
 */
export async function createAudioTrack(data: Prisma.AudioTrackUncheckedCreateInput): Promise<AudioTrack> {
  return prisma.audioTrack.create({ data })
}

/**
 * Создать несколько аудиодорожек
 */
export async function createManyAudioTracks(data: Prisma.AudioTrackCreateManyInput[]): Promise<{ count: number }> {
  return prisma.audioTrack.createMany({ data })
}

// === UPDATE ===

/**
 * Обновить аудиодорожку
 */
export async function updateAudioTrack(id: string, data: Prisma.AudioTrackUpdateInput): Promise<AudioTrack> {
  return prisma.audioTrack.update({
    where: { id },
    data,
  })
}

// === DELETE ===

/**
 * Удалить аудиодорожку
 */
export async function deleteAudioTrack(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.audioTrack.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Удалить аудиодорожки эпизода
 */
export async function deleteAudioTracksByEpisodeId(episodeId: string): Promise<{ count: number }> {
  return prisma.audioTrack.deleteMany({ where: { episodeId } })
}

// === QUERIES ===

/**
 * Получить уникальные dubGroup для аниме
 * Используется для подсветки локальных озвучек в метаданных Shikimori
 */
export async function getLocalDubGroups(animeId: string): Promise<string[]> {
  const tracks = await prisma.audioTrack.findMany({
    where: {
      episode: {
        animeId,
      },
      dubGroup: {
        not: null,
      },
    },
    select: {
      dubGroup: true,
    },
    distinct: ['dubGroup'],
  })

  return tracks.map((t) => t.dubGroup).filter((g): g is string => g !== null)
}

// === RESTORE ===

/**
 * Удалить сломанные аудиодорожки (без transcodedCid) для аниме
 */
export async function deleteBrokenAudioTracks(animeId: string): Promise<{ count: number }> {
  return prisma.audioTrack.deleteMany({
    where: {
      episode: { animeId },
      transcodedCid: null,
    },
  })
}

// === BATCH DELETE ===

/**
 * Пакетное удаление аудиодорожек по массиву ID
 */
export async function batchDeleteAudioTracks(trackIds: string[]): Promise<{ count: number }> {
  return prisma.audioTrack.deleteMany({
    where: { id: { in: trackIds } },
  })
}

// === BATCH UPDATE ===

/**
 * Пакетное обновление аудиодорожек
 * Используется для массового изменения language/dubGroup
 */
export async function batchUpdateAudioTracks(
  trackIds: string[],
  data: { language?: string; dubGroup?: string | null },
): Promise<{ count: number }> {
  return prisma.audioTrack.updateMany({
    where: { id: { in: trackIds } },
    data,
  })
}
