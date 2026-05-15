/**
 * API клиент для Animatrona TV
 *
 * Использует базовый клиент из @letar/animatrona-shared
 */

import { createApiClient } from '@letar/animatrona-shared'

import { useConnectionStore } from '@/store/connection'

const api = createApiClient(() => useConnectionStore.getState())

export const {
  getStatus,
  getLibrary,
  getAnimeDetails,
  getLastWatched,
  getEpisode,
  getProgress,
  saveProgress,
  getPosterUrl,
  getMediaUrl,
  getVideoCidUrl,
  getAudioCidUrl,
  getEpisodeVideoUrl,
  getIpfsUrl,
  getSubtitleUrlFromCid,
  getSubtitleVttUrl,
} = api
