/**
 * ControlsAutoHide — автоскрытие контролов плеера
 *
 * Автоматически скрывает контролы через HIDE_CONTROLS_TIMEOUT
 * после последнего движения мыши, когда видео воспроизводится
 */

import { HIDE_CONTROLS_TIMEOUT } from '../constants'

/** Опции ControlsAutoHide */
export interface ControlsAutoHideOptions {
  /** Таймаут скрытия (мс) */
  timeout?: number
  /** Callback при изменении видимости */
  onVisibilityChange?: (visible: boolean) => void
}

/**
 * Менеджер автоскрытия контролов
 */
export class ControlsAutoHide {
  private timeout: number
  private onVisibilityChange?: (visible: boolean) => void
  private hideTimeoutId: ReturnType<typeof setTimeout> | null = null
  private isPlaying = false
  private isVisible = true
  private isDestroyed = false

  constructor(options: ControlsAutoHideOptions = {}) {
    this.timeout = options.timeout ?? HIDE_CONTROLS_TIMEOUT
    this.onVisibilityChange = options.onVisibilityChange
  }

  /**
   * Установить callback
   */
  setCallback(callback: (visible: boolean) => void): void {
    this.onVisibilityChange = callback
  }

  /**
   * Сбросить таймер и показать контролы
   */
  resetTimeout(): void {
    if (this.isDestroyed) {
      return
    }

    // Очищаем предыдущий таймер
    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId)
      this.hideTimeoutId = null
    }

    // Показываем контролы
    this.setVisibility(true)

    // Если видео воспроизводится — запускаем таймер скрытия
    if (this.isPlaying) {
      this.hideTimeoutId = setTimeout(() => {
        this.setVisibility(false)
      }, this.timeout)
    }
  }

  /**
   * Установить состояние воспроизведения
   */
  setPlaying(playing: boolean): void {
    this.isPlaying = playing
    this.resetTimeout()
  }

  /**
   * Показать контролы
   */
  show(): void {
    this.setVisibility(true)
  }

  /**
   * Скрыть контролы
   */
  hide(): void {
    this.setVisibility(false)
  }

  /**
   * Получить текущую видимость
   */
  getVisibility(): boolean {
    return this.isVisible
  }

  /**
   * Уничтожить менеджер
   */
  destroy(): void {
    if (this.isDestroyed) {
      return
    }
    this.isDestroyed = true

    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId)
      this.hideTimeoutId = null
    }
  }

  /**
   * Установить видимость
   */
  private setVisibility(visible: boolean): void {
    if (this.isVisible === visible) {
      return
    }

    this.isVisible = visible
    this.onVisibilityChange?.(visible)
  }
}
