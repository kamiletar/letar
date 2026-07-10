/**
 * Загрузчик аудио/субтитров из IPFS манифестов для блока сравнения в модерации.
 *
 * Загружает EpisodeManifest первого эпизода и извлекает summary треков.
 * Опциональный — при ошибке возвращает пустой результат.
 */

import type { AnimeManifest, AnimeManifestEpisode, EpisodeManifest, EpisodesDocument } from '@letar/animatrona-types'

import type { AudioTrackSummary, SubtitleTrackSummary } from '@/app/admin/_components/types'

import { getGateway, getIpfsUrl } from './ipfs'
import { fetchIpfsJsonSafe } from './ipfs-fetch'

/** Результат загрузки треков */
export interface TracksSummary {
  /** Аудиодорожки первого эпизода */
  audioTracks: AudioTrackSummary[]
  /** Субтитры первого эпизода */
  subtitleTracks: SubtitleTrackSummary[]
}

/**
 * Загрузить EpisodeManifest первого эпизода (сырой объект).
 * Используется для извлечения voiceActing и других свойств из полного манифеста.
 *
 * @returns Полный EpisodeManifest первого эпизода или null при ошибке
 */
export async function loadFirstEpisodeManifest(directoryCid: string): Promise<EpisodeManifest | null> {
  try {
    const gateway = getGateway()

    const manifestUrl = `${gateway}/ipfs/${directoryCid}/manifest.json`
    const manifest = await fetchIpfsJsonSafe<AnimeManifest>(manifestUrl)
    if (!manifest) {
      return null
    }

    let episodes: AnimeManifestEpisode[] = []
    if (manifest.episodesCid) {
      const epsDoc = await fetchIpfsJsonSafe<EpisodesDocument>(getIpfsUrl(manifest.episodesCid))
      episodes = epsDoc?.episodes ?? []
    } else if (manifest.episodes) {
      episodes = manifest.episodes
    }

    if (episodes.length === 0) {
      return null
    }

    const firstEp = episodes.sort((a, b) => a.number - b.number)[0]
    if (!firstEp?.manifestCid) {
      return null
    }

    return await fetchIpfsJsonSafe<EpisodeManifest>(getIpfsUrl(firstEp.manifestCid))
  } catch {
    return null
  }
}

/**
 * Загрузить summary аудио/субтитров из первого эпизода аниме.
 *
 * Цепочка: manifestCid → AnimeManifest → episodesCid → EpisodesDocument → episode[0].manifestCid → EpisodeManifest
 *
 * @returns TracksSummary или null при ошибке
 */
export async function loadTracksSummary(directoryCid: string): Promise<TracksSummary | null> {
  try {
    const gateway = getGateway()

    // 1. Загружаем AnimeManifest
    const manifestUrl = `${gateway}/ipfs/${directoryCid}/manifest.json`
    const manifest = await fetchIpfsJsonSafe<AnimeManifest>(manifestUrl)
    if (!manifest) {
      return null
    }

    // 2. Получаем список эпизодов
    let episodes: AnimeManifestEpisode[] = []
    if (manifest.episodesCid) {
      const epsDoc = await fetchIpfsJsonSafe<EpisodesDocument>(getIpfsUrl(manifest.episodesCid))
      episodes = epsDoc?.episodes ?? []
    } else if (manifest.episodes) {
      episodes = manifest.episodes
    }

    if (episodes.length === 0) {
      return null
    }

    // 3. Берём первый эпизод (представителен для всего аниме)
    const firstEp = episodes.sort((a, b) => a.number - b.number)[0]
    if (!firstEp?.manifestCid) {
      return null
    }

    // 4. Загружаем EpisodeManifest
    const epManifest = await fetchIpfsJsonSafe<EpisodeManifest>(getIpfsUrl(firstEp.manifestCid))
    if (!epManifest) {
      return null
    }

    // 5. Извлекаем summary
    return {
      audioTracks: (epManifest.audioTracks ?? []).map((t) => ({
        language: t.language,
        title: t.title,
        codec: t.codec,
        channels: t.channels,
        dubGroup: t.dubGroup,
      })),
      subtitleTracks: (epManifest.subtitleTracks ?? []).map((t) => ({
        language: t.language,
        title: t.title,
        format: t.format,
        dubGroup: t.dubGroup,
      })),
    }
  } catch {
    return null
  }
}
