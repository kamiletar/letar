/**
 * Типы для состояния плеера
 */

import type { PlaybackSpeed } from '../constants'

/** Состояние плеера */
export interface PlayerState {
  /** Видео воспроизводится */
  isPlaying: boolean
  /** Текущее время воспроизведения (сек) */
  currentTime: number
  /** Общая длительность (сек) */
  duration: number
  /** Громкость (0-1) */
  volume: number
  /** Звук выключен */
  isMuted: boolean
  /** Полноэкранный режим */
  isFullscreen: boolean
  /** Идёт загрузка */
  isLoading: boolean
  /** Контролы видимы */
  showControlsOverlay: boolean
}

/** Опции инициализации плеера */
export interface PlayerOptions {
  /** Контейнер для video элемента */
  container: HTMLElement
  /** URL источника видео */
  src?: string
  /** Время начала воспроизведения (сек) */
  startTime?: number
  /** Автоматическое воспроизведение */
  autoPlay?: boolean
  /** Начальная громкость (0-1) */
  volume?: number
  /** Начальная скорость воспроизведения */
  playbackSpeed?: PlaybackSpeed
}

/** Метаданные видео */
export interface VideoMetadata {
  /** Кодек видео (AV1, HEVC, H.264) */
  videoCodec?: string
  /** Ширина видео */
  videoWidth?: number
  /** Высота видео */
  videoHeight?: number
  /** Битрейт видео (bps) */
  videoBitrate?: number
  /** Битность видео (8, 10, 12) */
  videoBitDepth?: number
  /** Кодек аудио */
  audioCodec?: string
  /** Битрейт аудио */
  audioBitrate?: number
  /** Каналы аудио */
  audioChannels?: number
  /** Формат субтитров */
  subtitleFormat?: string
  /** Язык субтитров */
  subtitleLanguage?: string
  /** Размер файла (байты) */
  fileSize?: number
}

/** Публичный API плеера */
export interface PlayerAPI {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  setVolume: (volume: number) => void
  getVolume: () => number
  setPlaybackRate: (rate: number) => void
  getPlaybackRate: () => number
  toggleFullscreen: () => void
  getVideoElement: () => HTMLVideoElement | null
  destroy: () => void
}
