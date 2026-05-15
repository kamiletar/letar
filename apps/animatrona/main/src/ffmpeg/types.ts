/**
 * Реэкспорт типов из shared для совместимости
 *
 * ВАЖНО: Все типы определены в shared/types.ts — единственный источник истины.
 * Этот файл существует только для совместимости с локальными импортами.
 */

export type {
  AudioTrack,
  AudioTranscodeOptions,
  AudioTranscodeVBROptions,
  BRefModeType,
  EncodingProfileOptions,
  MediaInfo,
  MergeChapter,
  MergeConfig,
  MultipassType,
  RateControlType,
  SubtitleTrack,
  TranscodeJob,
  TranscodeProgress,
  TuneType,
  VideoTrack,
  VideoTranscodeOptions,
} from '../../../shared/types'
