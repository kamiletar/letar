/**
 * Определение доступных озвучек и субтитров аниме на основе треков
 * из EpisodeManifest первого эпизода.
 *
 * Формат кодов (хранится в Anime.voiceActing String[]):
 * - DUB_RU, DUB_EN, DUB_JA — есть соответствующая аудиодорожка
 * - SUB_RU, SUB_EN, SUB_JA — есть соответствующие субтитры
 *
 * ISO 639-1 коды (ru, en, ja) нормализуются из языка трека.
 */

import type { EpisodeManifest } from '@letar/animatrona-types'

import { prisma } from './db'
import { loadFirstEpisodeManifest } from './track-loader'
import type { TrackedLanguage } from './voice-acting-labels'

// Реэкспорт для обратной совместимости (код импортов, использующих lib/voice-acting)
export { VOICE_ACTING_LABELS, type VoiceActingMeta } from './voice-acting-labels'

/**
 * Нормализует строку языка в ISO 639-1 код в верхнем регистре.
 * Поддерживает: "rus", "ru", "ru-RU", "russian" → "RU".
 */
function normalizeLanguage(lang: string | undefined | null): TrackedLanguage | null {
  if (!lang) {
    return null
  }
  const lower = lang.toLowerCase().trim()

  if (lower.startsWith('ru') || lower === 'rus' || lower === 'russian') {
    return 'RU'
  }
  if (lower.startsWith('en') || lower === 'eng' || lower === 'english') {
    return 'EN'
  }
  if (lower.startsWith('ja') || lower === 'jpn' || lower === 'japanese') {
    return 'JA'
  }
  return null
}

/**
 * Извлечь voiceActing коды из EpisodeManifest первого эпизода.
 *
 * @returns Массив уникальных кодов вида DUB_RU/SUB_EN/...
 */
export function extractVoiceActingCodes(epManifest: EpisodeManifest | null | undefined): string[] {
  if (!epManifest) {
    return []
  }

  const codes = new Set<string>()

  for (const track of epManifest.audioTracks ?? []) {
    const lang = normalizeLanguage(track.language)
    if (lang) {
      codes.add(`DUB_${lang}`)
    }
  }

  for (const track of epManifest.subtitleTracks ?? []) {
    const lang = normalizeLanguage(track.language)
    if (lang) {
      codes.add(`SUB_${lang}`)
    }
  }

  return Array.from(codes).sort()
}

/**
 * Загрузить EpisodeManifest первого эпизода из IPFS и обновить voiceActing в БД.
 * Fire-and-forget — при ошибке просто молча ничего не обновляет.
 *
 * Вызывается:
 * - При публикации аниме через POST /api/anime
 * - При backfill существующих аниме через /api/admin/backfill-voice-acting
 */
export async function updateVoiceActingFromIpfs(
  animeId: string,
  directoryCid: string | null | undefined,
): Promise<{ updated: boolean; codes: string[] }> {
  try {
    if (!directoryCid) {
      return { updated: false, codes: [] }
    }
    const epManifest = await loadFirstEpisodeManifest(directoryCid)
    if (!epManifest) {
      return { updated: false, codes: [] }
    }

    const codes = extractVoiceActingCodes(epManifest)
    await prisma.anime.update({
      where: { id: animeId },
      data: { voiceActing: codes },
    })

    return { updated: true, codes }
  } catch (err) {
    console.warn(`[voice-acting] Не удалось обновить аниме ${animeId}:`, err)
    return { updated: false, codes: [] }
  }
}
