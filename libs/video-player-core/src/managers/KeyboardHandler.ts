/**
 * KeyboardHandler — обработка горячих клавиш плеера
 *
 * Поддерживаемые клавиши:
 * - Space/k: play/pause
 * - ←/→: перемотка назад/вперёд
 * - ↑/↓: громкость
 * - M: mute/unmute
 * - F: fullscreen
 * - [ / ]: скорость воспроизведения ±0.25x
 * - I: информация о видео
 *
 * Поддерживает русскую раскладку
 */

import { SKIP_TIME, VOLUME_STEP } from '../constants'

/** Опции KeyboardHandler */
export interface KeyboardHandlerOptions {
  /** Video элемент (для управления громкостью) */
  video: HTMLVideoElement
}

/** Callbacks для KeyboardHandler */
export interface KeyboardHandlerCallbacks {
  /** Переключить play/pause */
  onTogglePlay?: () => void
  /** Перемотка (delta в секундах) */
  onSeek?: (delta: number) => void
  /** Изменить громкость (delta) */
  onVolumeChange?: (delta: number) => void
  /** Переключить mute */
  onToggleMute?: () => void
  /** Переключить fullscreen */
  onToggleFullscreen?: () => void
  /** Изменить скорость (delta) */
  onPlaybackRateChange?: (delta: number) => void
  /** Переключить информацию о видео */
  onToggleVideoInfo?: () => void
}

/**
 * Обработчик горячих клавиш
 */
export class KeyboardHandler {
  private video: HTMLVideoElement
  private callbacks: KeyboardHandlerCallbacks = {}
  private isRegistered = false
  private boundHandler: (e: KeyboardEvent) => void

  constructor(options: KeyboardHandlerOptions) {
    this.video = options.video
    this.boundHandler = this.handleKeyDown.bind(this)
  }

  /**
   * Установить callbacks
   */
  setCallbacks(callbacks: KeyboardHandlerCallbacks): void {
    this.callbacks = callbacks
  }

  /**
   * Зарегистрировать обработчик
   */
  register(): void {
    if (this.isRegistered) {
      return
    }
    window.addEventListener('keydown', this.boundHandler)
    this.isRegistered = true
  }

  /**
   * Удалить обработчик
   */
  unregister(): void {
    if (!this.isRegistered) {
      return
    }
    window.removeEventListener('keydown', this.boundHandler)
    this.isRegistered = false
  }

  /**
   * Обработчик нажатия клавиш
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Игнорируем если фокус на input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.key) {
      // Play/Pause
      case ' ':
      case 'k':
      case 'л': // Русская раскладка (k)
        e.preventDefault()
        this.callbacks.onTogglePlay?.()
        break

      // Перемотка
      case 'ArrowLeft':
        e.preventDefault()
        this.callbacks.onSeek?.(-SKIP_TIME)
        break
      case 'ArrowRight':
        e.preventDefault()
        this.callbacks.onSeek?.(SKIP_TIME)
        break

      // Громкость
      case 'ArrowUp':
        e.preventDefault()
        if (this.callbacks.onVolumeChange) {
          this.callbacks.onVolumeChange(VOLUME_STEP)
        } else {
          this.video.volume = Math.min(1, this.video.volume + VOLUME_STEP)
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (this.callbacks.onVolumeChange) {
          this.callbacks.onVolumeChange(-VOLUME_STEP)
        } else {
          this.video.volume = Math.max(0, this.video.volume - VOLUME_STEP)
        }
        break

      // Mute
      case 'm':
      case 'ь': // Русская раскладка (m)
        e.preventDefault()
        this.callbacks.onToggleMute?.()
        break

      // Fullscreen
      case 'f':
      case 'а': // Русская раскладка (f)
        e.preventDefault()
        this.callbacks.onToggleFullscreen?.()
        break

      // Скорость воспроизведения
      case '[':
      case 'х': // Русская раскладка
        e.preventDefault()
        this.callbacks.onPlaybackRateChange?.(-0.25)
        break
      case ']':
      case 'ъ': // Русская раскладка
        e.preventDefault()
        this.callbacks.onPlaybackRateChange?.(0.25)
        break

      // Информация о видео
      case 'i':
      case 'ш': // Русская раскладка (i)
        e.preventDefault()
        this.callbacks.onToggleVideoInfo?.()
        break
    }
  }

  /**
   * Уничтожить обработчик
   */
  destroy(): void {
    this.unregister()
    this.callbacks = {}
  }
}
