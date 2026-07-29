'use client'

/**
 * Вспомогательные функции для работы с аудио и субтитрами
 */

import { resolveTrackKey as getTrackKey } from '../../../../../shared/types/track-key'
import type { EpisodeWithTracks, TrackInfo } from './export-types'

export { getTrackKey }

/**
 * Собирает уникальные аудиодорожки из всех эпизодов
 * Дорожка считается готовой если есть transcodedCid (IPFS-only подход)
 */
export function collectAudioTracks(episodes: EpisodeWithTracks[]): TrackInfo[] {
  const trackMap = new Map<string, TrackInfo>()

  for (const episode of episodes) {
    for (const track of episode.audioTracks) {
      const key = getTrackKey(track.language, track.title)

      const existing = trackMap.get(key)
      if (existing) {
        existing.episodeCount++
        // Проверяем, все ли дорожки мигрированы в IPFS
        if (!track.transcodedCid) {
          existing.allReady = false
        }
      } else {
        trackMap.set(key, {
          key,
          language: track.language,
          title: track.title || 'default',
          codec: track.codec,
          channels: track.channels,
          episodeCount: 1,
          allReady: !!track.transcodedCid,
        })
      }
    }
  }

  return Array.from(trackMap.values()).sort((a, b) => {
    if (a.language !== b.language) {
      return a.language.localeCompare(b.language)
    }
    return a.title.localeCompare(b.title)
  })
}

/**
 * Собирает уникальные субтитры из всех эпизодов
 * Субтитры считаются готовыми если есть fileCid (IPFS-only подход)
 */
export function collectSubtitleTracks(episodes: EpisodeWithTracks[]): TrackInfo[] {
  const trackMap = new Map<string, TrackInfo>()

  for (const episode of episodes) {
    for (const track of episode.subtitleTracks) {
      const key = getTrackKey(track.language, track.title)

      const existingSubtitle = trackMap.get(key)
      if (existingSubtitle) {
        existingSubtitle.episodeCount++
        // Проверяем, все ли субтитры мигрированы в IPFS
        if (!track.fileCid) {
          existingSubtitle.allReady = false
        }
      } else {
        trackMap.set(key, {
          key,
          language: track.language,
          title: track.title || 'default',
          format: track.format,
          episodeCount: 1,
          allReady: !!track.fileCid,
        })
      }
    }
  }

  return Array.from(trackMap.values()).sort((a, b) => {
    if (a.language !== b.language) {
      return a.language.localeCompare(b.language)
    }
    return a.title.localeCompare(b.title)
  })
}
