/**
 * Загрузчик EpisodeManifest из IPFS
 *
 * Серверная загрузка: anime (DB) → AnimeManifest (IPFS) → EpisodesDocument → EpisodeManifest.
 * Используется страницей плеера для передачи данных клиенту.
 */

import type { AnimeManifest, AnimeManifestEpisode, EpisodeManifest, EpisodesDocument } from '@letar/animatrona-types'

import { getIpfsUrl } from './ipfs'
import { fetchIpfsJson } from './ipfs-fetch'

/**
 * Загрузить EpisodeManifest по directoryCid аниме и номеру эпизода.
 *
 * Цепочка: directoryCid → AnimeManifest → episodesCid → EpisodesDocument → episode.manifestCid → EpisodeManifest
 *
 * @param directoryCid CID директории аниме
 * @param episodeNumber Номер эпизода
 * @returns EpisodeManifest или null при ошибке
 */
export async function loadEpisodeManifest(
  directoryCid: string,
  episodeNumber: number
): Promise<{ manifest: EpisodeManifest; episodeInfo: AnimeManifestEpisode } | null> {
  try {
    // 1. Загружаем AnimeManifest
    const manifestUrl = `${getIpfsUrl(directoryCid)}/manifest.json`
    const animeManifest = await fetchIpfsJson<AnimeManifest>(manifestUrl)

    // 2. Загружаем список эпизодов
    let episodes: AnimeManifestEpisode[] = []
    if (animeManifest.episodesCid) {
      const epsDoc = await fetchIpfsJson<EpisodesDocument>(getIpfsUrl(animeManifest.episodesCid))
      episodes = epsDoc.episodes ?? []
    } else if (animeManifest.episodes) {
      episodes = animeManifest.episodes
    }

    // 3. Находим нужный эпизод
    const episodeInfo = episodes.find((e) => e.number === episodeNumber)
    if (!episodeInfo?.manifestCid) {
      return null
    }

    // 4. Загружаем EpisodeManifest
    const episodeManifest = await fetchIpfsJson<EpisodeManifest>(getIpfsUrl(episodeInfo.manifestCid))

    // Fallback: если video.cid отсутствует, берём videoCid из AnimeManifest
    if (!episodeManifest.video?.cid && episodeInfo.videoCid) {
      episodeManifest.video = {
        ...episodeManifest.video,
        cid: episodeInfo.videoCid,
      }
    }

    return { manifest: episodeManifest, episodeInfo }
  } catch (err) {
    console.error(`[episode-loader] Ошибка загрузки эпизода ${episodeNumber}:`, err)
    return null
  }
}
