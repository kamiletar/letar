/**
 * Типы событий плеера
 */

import type { PlayerState } from './player'

/** Карта событий плеера */
export interface PlayerEventMap {
  /** Плеер готов к воспроизведению */
  ready: void
  /** Начало воспроизведения */
  play: void
  /** Пауза */
  pause: void
  /** Окончание видео */
  ended: void
  /** Изменение времени воспроизведения */
  timeupdate: { currentTime: number; duration: number }
  /** Изменение громкости */
  volumechange: { volume: number; muted: boolean }
  /** Изменение длительности */
  durationchange: { duration: number }
  /** Перемотка */
  seeked: { currentTime: number }
  /** Изменение скорости */
  ratechange: { playbackRate: number }
  /** Изменение fullscreen */
  fullscreenchange: { isFullscreen: boolean }
  /** Ошибка */
  error: { error: Error }
  /** Изменение состояния загрузки */
  loadingchange: { isLoading: boolean }
  /** Изменение состояния */
  statechange: PlayerState
}

/** Тип обработчика события */
export type PlayerEventHandler<K extends keyof PlayerEventMap> = PlayerEventMap[K] extends void ? () => void
  : (data: PlayerEventMap[K]) => void

/** Тип подписки на событие */
export type PlayerEventUnsubscribe = () => void
