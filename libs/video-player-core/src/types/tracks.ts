/**
 * Типы для аудио/субтитров дорожек
 */

/** Статус транскодирования аудио */
export type AudioTranscodeStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'SKIPPED'

/** Информация об аудиодорожке */
export interface AudioTrackInfo {
  /** Уникальный ID */
  id: string
  /** Код языка (ISO 639-1) */
  language: string
  /** Название дорожки */
  title?: string
  /** Кодек (AAC, OPUS, FLAC) */
  codec: string
  /** Каналы (2.0, 5.1, 7.1) */
  channels: string
  /** Дорожка по умолчанию */
  isDefault: boolean
  /**
   * @deprecated Оставлено для обратной совместимости. Используй transcodedCid.
   */
  transcodedPath?: string
  /** CID в IPFS — единственный проверяемый источник */
  transcodedCid?: string
  /** Статус транскодирования (опционален для web-контекста) */
  transcodeStatus?: AudioTranscodeStatus
}

/** Формат субтитров */
export type SubtitleFormat = 'ass' | 'ssa' | 'srt' | 'vtt'

/** Внутренний формат субтитров для рендеринга */
export type SubtitleRenderFormat = 'ass' | 'native' | null

/** Информация о дорожке субтитров */
export interface SubtitleTrackInfo {
  /** Уникальный ID */
  id: string
  /** Код языка (ISO 639-1) */
  language: string
  /** Название дорожки */
  title?: string
  /** Формат субтитров */
  format: SubtitleFormat
  /** Дорожка по умолчанию */
  isDefault: boolean
  /**
   * @deprecated Оставлено для обратной совместимости. Используй fileCid.
   */
  filePath?: string
  /** CID файла в IPFS */
  fileCid?: string
  /** URL'ы к шрифтам (для ASS) */
  fonts?: string[]
  /** CID'ы шрифтов в IPFS */
  fontCids?: string[]
}
