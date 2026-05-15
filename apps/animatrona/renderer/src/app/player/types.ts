/**
 * Типы для папочного режима плеера
 */

import type { EpisodeType } from '@/lib/parse-filename'
import type {
  ExternalAudioMatch,
  ExternalAudioScanResult,
  ExternalSubtitleMatch,
  ExternalSubtitleScanResult,
  MediaFileInfo,
} from '@/types/electron'

/** Эпизод в папочном режиме (без импорта в БД) */
export interface FolderEpisode extends MediaFileInfo {
  /** Номер эпизода (null если не удалось распарсить) */
  episodeNumber: number | null
  /** Тип эпизода */
  episodeType: EpisodeType
  /** Является бонусным видео (creditless OP/ED, PV) */
  isBonus: boolean
}

/** Категория бонусного видео */
export type BonusCategory = 'op' | 'ed' | 'pv' | 'other'

/** Внешние дорожки для текущего эпизода */
export interface ExternalTracksInfo {
  /** Внешние аудиодорожки */
  audio: ExternalAudioMatch[]
  /** Внешние субтитры */
  subtitles: ExternalSubtitleMatch[]
  /** Результат сканирования субтитров (для доступа к fontsDirs) */
  subtitleScanResult: ExternalSubtitleScanResult | null
  /** Результат сканирования аудио */
  audioScanResult: ExternalAudioScanResult | null
}

/** Встроенная аудиодорожка из MKV */
export interface EmbeddedAudioTrack {
  /** Stream index в контейнере */
  index: number
  /** Язык дорожки (ISO 639) */
  language: string
  /** Название дорожки */
  title: string
  /** Кодек (aac, opus, flac, ac3, dts) */
  codec: string
  /** Количество каналов */
  channels: number
  /** Битрейт в bps */
  bitrate?: number
}

/** Встроенные субтитры из MKV */
export interface EmbeddedSubtitleTrack {
  /** Stream index в контейнере */
  index: number
  /** Язык субтитров (ISO 639) */
  language: string
  /** Название дорожки */
  title: string
  /** Кодек (ass, subrip, hdmv_pgs_subtitle) */
  codec: string
}

/** Встроенные дорожки из текущего MKV */
export interface EmbeddedTracksInfo {
  /** Аудиодорожки */
  audio: EmbeddedAudioTrack[]
  /** Субтитры */
  subtitles: EmbeddedSubtitleTrack[]
}

/** Режим работы плеера */
export type PlayerMode = 'idle' | 'single' | 'folder'

/** Состояние папочного плеера */
export interface FolderPlayerState {
  /** Текущий режим */
  mode: PlayerMode
  /** Путь к папке (для режима folder) */
  folderPath: string | null
  /** Название папки (для отображения) */
  folderName: string | null
  /** Основные эпизоды (отсортированы по номеру) */
  episodes: FolderEpisode[]
  /** Бонусные видео (OP/ED/PV) */
  bonusVideos: FolderEpisode[]
  /** Индекс текущего эпизода (-1 если не выбран) */
  currentIndex: number
  /** Флаг: текущее видео — бонус */
  isCurrentBonus: boolean
  /** Индекс в массиве бонусов (если isCurrentBonus) */
  currentBonusIndex: number
  /** Внешние дорожки для текущего эпизода */
  externalTracks: ExternalTracksInfo
  /** Встроенные дорожки из текущего MKV */
  embeddedTracks: EmbeddedTracksInfo | null
  /** Идёт сканирование */
  isScanning: boolean
  /** Идёт загрузка дорожек */
  isLoadingTracks: boolean
  /** Ошибка */
  error: string | null
}

/** Запись о прогрессе просмотра */
export interface WatchProgressEntry {
  /** Текущая позиция в секундах */
  time: number
  /** Общая длительность в секундах */
  duration: number
  /** Timestamp последнего обновления */
  updatedAt: number
}

/** Хранилище прогресса просмотра (путь файла → запись) */
export type WatchProgressStorage = Record<string, WatchProgressEntry>

/** Запись об открытой папке */
export interface FolderHistoryEntry {
  /** Полный путь к папке */
  folderPath: string
  /** Имя папки (для отображения) */
  folderName: string
  /** Количество эпизодов в папке */
  episodeCount: number
  /** Timestamp последнего открытия */
  lastOpenedAt: number
}

/** Хранилище истории папок */
export type FolderHistoryStorage = FolderHistoryEntry[]

/** Паттерны для определения бонусных видео */
export const BONUS_PATTERNS = {
  /** Creditless Opening */
  op: /\b(?:creditless|clean|nc|nced|op(?:ening)?)\b/i,
  /** Creditless Ending */
  ed: /\b(?:creditless|clean|nc|nced|ed(?:ing)?)\b/i,
  /** Preview / PV / Trailer */
  pv: /\b(?:pv|trailer|preview|cm|teaser|promo)\b/i,
  /** Bonus folder */
  bonusFolder: /\b(?:bonus|extra|special|omake|specials|extras)\b/i,
}

/**
 * Определяет категорию бонусного видео по имени файла/папки
 */
export function detectBonusCategory(filePath: string): BonusCategory | null {
  const lowerPath = filePath.toLowerCase()

  // Проверяем паттерны
  if (BONUS_PATTERNS.op.test(lowerPath) && /\bop/i.test(lowerPath)) {
    return 'op'
  }
  if (BONUS_PATTERNS.ed.test(lowerPath) && /\bed/i.test(lowerPath)) {
    return 'ed'
  }
  if (BONUS_PATTERNS.pv.test(lowerPath)) {
    return 'pv'
  }

  // Если файл в папке Bonus/
  if (BONUS_PATTERNS.bonusFolder.test(lowerPath)) {
    return 'other'
  }

  return null
}

/**
 * Проверяет, является ли файл бонусным видео
 */
export function isBonusVideo(filePath: string): boolean {
  return detectBonusCategory(filePath) !== null
}
