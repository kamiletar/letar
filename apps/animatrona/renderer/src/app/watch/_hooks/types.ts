'use client'

/**
 * Типы для хуков страницы просмотра
 */

import type { AudioTrack, Episode, SubtitleFont, SubtitleTrack } from '@/generated/prisma'

/** Тип SubtitleTrack с включёнными шрифтами */
export type SubtitleTrackWithFonts = SubtitleTrack & {
  fonts: SubtitleFont[]
}

/** Тип Episode с включёнными дорожками */
export type EpisodeWithTracks = Episode & {
  audioTracks: AudioTrack[]
  subtitleTracks: SubtitleTrackWithFonts[]
  anime: {
    id: string
    name: string
    originalName: string | null
    year: number | null
    folderPath: string | null
    shikimoriId: number | null
    watchStatus: string
    userRating: number | null
    isBdRemux: boolean
    lastSelectedAudioDubGroup: string | null
    lastSelectedSubtitleDubGroup: string | null
    lastSelectedAudioLanguage: string | null
    lastSelectedSubtitleLanguage: string | null
    poster: { cid?: string | null } | null
  }
  season: { id: string; number: number } | null
}

/** Минимальная информация об эпизоде для навигации */
export interface EpisodeNavInfo {
  id: string
  number: number
  name?: string | null
  /** JSON массив CID thumbnail'ов в IPFS для UpNext overlay */
  thumbnailCids?: string | null
}

/** Интервал сохранения прогресса (мс) */
export const SAVE_INTERVAL = 5000
