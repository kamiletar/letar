/**
 * Desktop адаптер — обёртка над shared createApiClient
 *
 * Desktop сервер (Animatrona на локальной машине):
 * - Без авторизации
 * - /api/library, /api/library/{id}, /api/progress/{id}
 * - Локальные файлы (/api/media?path=) + IPFS CID
 */

import { createApiClient } from '@letar/animatrona-shared'

import type { ServerConfig } from '@/types/server'
import type { ServerAdapter } from './types'

/** Создать Desktop адаптер */
export function createDesktopAdapter(server: ServerConfig): ServerAdapter {
  const client = createApiClient(() => ({
    connection: { serverUrl: server.url },
  }))

  return {
    // Desktop не поддерживает серверный поиск — options.search игнорируется
    getLibrary: () => client.getLibrary(),
    getAnimeDetails: client.getAnimeDetails,
    getPosterUrl: client.getPosterUrl,
    getEpisodeVideoUrl: client.getEpisodeVideoUrl,
    getAudioCidUrl: client.getAudioCidUrl,
    getProgress: client.getProgress,
    saveProgress: client.saveProgress,
    getLastWatched: client.getLastWatched,
    getIpfsUrl: client.getIpfsUrl,
    getSubtitleVttUrl: client.getSubtitleVttUrl,
    getSubtitleUrlFromCid: client.getSubtitleUrlFromCid,
    getMediaUrl: client.getMediaUrl,
    fetchApi: client.fetchApi,
    getApiBase: client.getApiBase,

    checkStatus: async () => {
      try {
        const status = await client.getStatus()
        return status.server?.isRunning === true
      } catch {
        return false
      }
    },
  }
}
