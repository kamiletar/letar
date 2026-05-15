/**
 * Типы для @letar/exoplayer-sync
 *
 * Компонент для синхронного воспроизведения видео + внешнего аудио
 * через ExoPlayer MergingMediaSource
 */

import type { ViewStyle } from 'react-native'

/** Режим масштабирования видео */
export type ResizeMode = 'contain' | 'cover' | 'stretch'

/** Информация о загруженном медиа */
export interface OnLoadData {
  /** Длительность в секундах */
  duration: number
  /** Ширина видео в пикселях */
  naturalWidth: number
  /** Высота видео в пикселях */
  naturalHeight: number
}

/** Информация о прогрессе воспроизведения */
export interface OnProgressData {
  /** Текущее время в секундах */
  currentTime: number
  /** Буферизованная длительность в секундах */
  playableDuration: number
}

/** Информация об ошибке */
export interface OnErrorData {
  /** Код ошибки */
  code: string
  /** Сообщение об ошибке */
  message: string
}

/** Информация о seek */
export interface OnSeekData {
  /** Текущее время после seek в секундах */
  currentTime: number
  /** Целевое время seek в секундах */
  seekTime: number
}

/** Props для SyncVideoPlayer */
export interface SyncVideoPlayerProps {
  /** URI видео файла (обязательно) */
  videoSource: string
  /** URI внешнего аудио файла (опционально) */
  audioSource?: string | null
  /** Приостановлено ли воспроизведение */
  paused?: boolean
  /** Громкость (0.0 - 1.0) */
  volume?: number
  /** Отключить звук */
  muted?: boolean
  /** Режим масштабирования */
  resizeMode?: ResizeMode
  /** Стиль контейнера */
  style?: ViewStyle

  /** Callback при загрузке медиа */
  onLoad?: (data: OnLoadData) => void
  /** Callback при прогрессе воспроизведения */
  onProgress?: (data: OnProgressData) => void
  /** Callback при ошибке */
  onError?: (data: OnErrorData) => void
  /** Callback при окончании воспроизведения */
  onEnd?: () => void
  /** Callback при выполнении seek */
  onSeek?: (data: OnSeekData) => void
}

/** Ref методы для SyncVideoPlayer */
export interface SyncVideoPlayerRef {
  /** Перемотка на указанную позицию (в секундах) */
  seek: (positionSeconds: number) => void
  /** Начать воспроизведение */
  play: () => void
  /** Приостановить воспроизведение */
  pause: () => void
}

/** Native props для RCT компонента */
export interface NativeSyncVideoViewProps {
  videoSource: string
  audioSource?: string | null
  paused: boolean
  volume: number
  muted: boolean
  resizeMode: ResizeMode
  style?: ViewStyle
  onSyncVideoLoad?: (event: { nativeEvent: OnLoadData }) => void
  onSyncVideoProgress?: (event: { nativeEvent: OnProgressData }) => void
  onSyncVideoError?: (event: { nativeEvent: OnErrorData }) => void
  onSyncVideoEnd?: (event: { nativeEvent: Record<string, never> }) => void
  onSyncVideoSeek?: (event: { nativeEvent: OnSeekData }) => void
}
