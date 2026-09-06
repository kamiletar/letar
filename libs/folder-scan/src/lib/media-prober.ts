/**
 * Нормализованный результат проб медиафайла + интерфейс `MediaProber`.
 *
 * Планируется две реализации: `FfprobeProber` (Animatrona, бинарь ffmpeg уже в комплекте)
 * и `MediaInfoWasmProber` (будущий `animatrona-player`, mediainfo.js WASM — без ffmpeg).
 * Обе обязаны отдавать одну и ту же форму `MediaInfo`, иначе плеер и UI получат разные данные
 * в зависимости от того, какое приложение их обрабатывало.
 */

import type { SubtitleType } from './subtitle-type'

/** Информация об аудиодорожке */
export interface AudioTrack {
  /** Путь к входному файлу */
  input: string
  /** Индекс потока в контейнере */
  index: number
  /** Код языка (ru, en, jp, und) */
  language: string
  /** Название дорожки */
  title: string
  /** Кодек */
  codec?: string
  /** Битрейт */
  bitrate?: number
  /** Количество каналов */
  channels?: number
  /** Дорожка помечена дефолтной в контейнере (`disposition.default`) */
  isDefault?: boolean
  /** Дорожка помечена forced в контейнере (`disposition.forced`) */
  isForced?: boolean
  /** Теги (для извлечения группы/автора) */
  tags?: Record<string, string>
}

/** Информация о субтитрах */
export interface SubtitleTrack {
  /** Путь к файлу субтитров */
  path: string
  /** Индекс потока в контейнере */
  index: number
  /** Кодек/формат (ass, subrip, hdmv_pgs_subtitle) */
  codec: string
  /** Код языка */
  language: string
  /** Название дорожки */
  title: string
  /** Пути к файлам шрифтов */
  fonts: string[]
  /** Дорожка помечена дефолтной в контейнере (`disposition.default`) */
  isDefault?: boolean
  /** Дорожка помечена forced — показывать даже при выключенных субтитрах */
  isForced?: boolean
  /** Тип содержимого: полные / надписи / песни */
  subtitleType?: SubtitleType
  /** Теги (для извлечения типа) */
  tags?: Record<string, string>
}

/** Информация о видеодорожке */
export interface VideoTrack {
  /** Путь к файлу */
  path: string
  /** Длительность в секундах */
  duration: number
  /** Ширина */
  width?: number
  /** Высота */
  height?: number
  /** Кодек */
  codec?: string
  /** Битрейт */
  bitrate?: number
  /** Частота кадров */
  fps?: number
  /** Формат пикселей (yuv420p, yuv420p10le, yuv444p10le) */
  pixelFormat?: string
  /** Битность цвета (8, 10, 12) */
  bitDepth?: number
  /** Порядок полей: tt/bb = interlaced, progressive = прогрессивное */
  fieldOrder?: string
  /** Цветовое пространство (bt709, bt2020) */
  colorSpace?: string
  /** Профиль кодека (Main, Main 10, High) */
  profile?: string
}

/** Глава из MKV контейнера */
export interface MediaChapter {
  /** Начало в секундах */
  start: number
  /** Конец в секундах */
  end: number
  /** Название главы */
  title: string
}

/** Полная информация о медиафайле — единый нормализованный формат обеих реализаций MediaProber */
export interface MediaInfo {
  /** Путь к файлу */
  path: string
  /** Длительность в секундах */
  duration: number
  /** Размер файла в байтах */
  size: number
  /** Формат контейнера */
  format: string
  /** Видеодорожки */
  videoTracks: VideoTrack[]
  /** Аудиодорожки */
  audioTracks: AudioTrack[]
  /** Субтитры */
  subtitleTracks: SubtitleTrack[]
  /** Главы (из MKV контейнера) */
  chapters?: MediaChapter[]
  /** Вложения-шрифты (имена файлов) */
  attachmentFonts?: string[]
}

/** Проберщик медиафайлов — общий контракт для ffprobe и mediainfo.js реализаций */
export interface MediaProber {
  probe(filePath: string): Promise<MediaInfo>
}
