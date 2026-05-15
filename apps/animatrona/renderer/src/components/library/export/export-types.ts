'use client'

/**
 * Типы для диалога экспорта сериала
 */

import type { AudioTrack, Episode, Season, SubtitleFont, SubtitleTrack } from '@/generated/prisma'
import type { SeasonType } from '../../../../../shared/types/export'

/** Тип SubtitleTrack с шрифтами */
export type SubtitleTrackWithFonts = SubtitleTrack & {
  fonts: SubtitleFont[]
}

/** Тип Episode с дорожками */
export type EpisodeWithTracks = Episode & {
  audioTracks: AudioTrack[]
  subtitleTracks: SubtitleTrackWithFonts[]
  season: Season
}

/** Props для ExportSeriesDialog */
export interface ExportSeriesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  anime: {
    id: string
    name: string
    /** Оригинальное название (японское) */
    originalName?: string | null
    year?: number | null
    posterPath?: string | null
    /** CID постера в IPFS */
    posterCid?: string | null
    episodes: EpisodeWithTracks[]
    /** Франшиза (для структуры папок) */
    franchise?: string | null
    /** Тип сезона (для автовыбора паттерна) */
    seasonType?: SeasonType | null
    /** Shikimori ID для определения порядка во франшизе */
    shikimoriId?: number | null
    /** ID франшизы для загрузки графа */
    franchiseId?: string | null
  }
  /** Папка экспорта по умолчанию из настроек */
  defaultExportPath?: string
}

/** Шаг диалога */
export type DialogStep = 'config' | 'progress' | 'done' | 'result'

/** Тип экспорта */
export type ExportType = 'mkv' | 'web'

/** Режим ресурсов Web Player */
export type WebResourceMode = 'embedded' | 'referenced' | 'publish'

/** Результат публикации для отображения */
export interface PublishResult {
  rootCid: string
  gatewayUrl: string
  publicGatewayUrl: string
}

/** Информация о дорожке для UI */
export interface TrackInfo {
  key: string
  language: string
  title: string
  codec?: string
  channels?: string
  format?: string
  episodeCount: number
  allReady: boolean
}
