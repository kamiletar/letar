/**
 * Типы для папочного режима плеера
 */

import type { SubtitleType } from '@letar/folder-scan'

import type { EpisodeType } from './parse-filename'

import type {
  ExternalAudioMatch,
  ExternalAudioScanResult,
  ExternalSubtitleMatch,
  ExternalSubtitleScanResult,
  MediaFileInfo,
  ProbedChapter,
} from './host'

/** Эпизод в папочном режиме (без импорта в БД) */
export interface FolderEpisode extends MediaFileInfo {
  episodeNumber: number | null
  episodeType: EpisodeType
  isBonus: boolean
}

export type BonusCategory = 'op' | 'ed' | 'pv' | 'other'

export interface ExternalTracksInfo {
  audio: ExternalAudioMatch[]
  subtitles: ExternalSubtitleMatch[]
  subtitleScanResult: ExternalSubtitleScanResult | null
  audioScanResult: ExternalAudioScanResult | null
}

export interface EmbeddedAudioTrack {
  index: number
  language: string
  title: string
  codec: string
  channels: number
  bitrate?: number
  isDefault?: boolean
  isForced?: boolean
}

export interface EmbeddedSubtitleTrack {
  index: number
  language: string
  title: string
  codec: string
  isDefault?: boolean
  isForced?: boolean
  subtitleType?: SubtitleType
}

export interface EmbeddedTracksInfo {
  audio: EmbeddedAudioTrack[]
  subtitles: EmbeddedSubtitleTrack[]
}

export type PlayerMode = 'idle' | 'single' | 'folder'

export interface FolderPlayerState {
  mode: PlayerMode
  folderPath: string | null
  folderName: string | null
  episodes: FolderEpisode[]
  bonusVideos: FolderEpisode[]
  currentIndex: number
  isCurrentBonus: boolean
  currentBonusIndex: number
  externalTracks: ExternalTracksInfo
  embeddedTracks: EmbeddedTracksInfo | null
  /** Главы (OP/ED/recap/preview) текущего эпизода, найденные пробой контейнера */
  chapters: ProbedChapter[] | null
  isScanning: boolean
  isLoadingTracks: boolean
  error: string | null
}

export interface WatchProgressEntry {
  time: number
  duration: number
  updatedAt: number
}
export type WatchProgressStorage = Record<string, WatchProgressEntry>

export interface FolderHistoryEntry {
  folderPath: string
  folderName: string
  episodeCount: number
  lastOpenedAt: number
}
export type FolderHistoryStorage = FolderHistoryEntry[]

export const BONUS_PATTERNS = {
  op: /\b(?:creditless|clean|nc|nced|op(?:ening)?)\b/i,
  ed: /\b(?:creditless|clean|nc|nced|ed(?:ing)?)\b/i,
  pv: /\b(?:pv|trailer|preview|cm|teaser|promo)\b/i,
  bonusFolder: /\b(?:bonus|extra|special|omake|specials|extras)\b/i,
}

export function detectBonusCategory(filePath: string): BonusCategory | null {
  const lowerPath = filePath.toLowerCase()
  if (BONUS_PATTERNS.op.test(lowerPath) && /\bop/i.test(lowerPath)) { return 'op' }
  if (BONUS_PATTERNS.ed.test(lowerPath) && /\bed/i.test(lowerPath)) { return 'ed' }
  if (BONUS_PATTERNS.pv.test(lowerPath)) { return 'pv' }
  if (BONUS_PATTERNS.bonusFolder.test(lowerPath)) { return 'other' }
  return null
}

export function isBonusVideo(filePath: string): boolean {
  return detectBonusCategory(filePath) !== null
}
