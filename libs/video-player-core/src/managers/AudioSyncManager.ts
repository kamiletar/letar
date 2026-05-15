/**
 * AudioSyncManager — синхронизация video + audio
 *
 * Используется в режиме раздельных аудиодорожек:
 * - Синхронизирует время воспроизведения
 * - Синхронизирует play/pause
 * - Синхронизирует громкость и скорость
 */

import { AUDIO_SYNC_THRESHOLD } from '../constants'

/**
 * Менеджер синхронизации video + audio
 */
export class AudioSyncManager {
  private video: HTMLVideoElement
  private audio: HTMLAudioElement
  private isDestroyed = false
  private isSyncing = false

  // Bound handlers для корректного удаления
  private handlePlay: () => void
  private handlePause: () => void
  private handleSeeked: () => void
  private handleRateChange: () => void
  private handleVolumeChange: () => void
  private handleTimeUpdate: () => void

  constructor(video: HTMLVideoElement, audio: HTMLAudioElement) {
    this.video = video
    this.audio = audio

    // Создаём bound handlers
    this.handlePlay = this.onPlay.bind(this)
    this.handlePause = this.onPause.bind(this)
    this.handleSeeked = this.onSeeked.bind(this)
    this.handleRateChange = this.onRateChange.bind(this)
    this.handleVolumeChange = this.onVolumeChange.bind(this)
    this.handleTimeUpdate = this.onTimeUpdate.bind(this)
  }

  /**
   * Инициализировать синхронизацию
   */
  init(): void {
    // Начальная синхронизация
    this.audio.volume = this.video.volume
    this.audio.muted = false // audio.muted контролируется отдельно
    this.audio.playbackRate = this.video.playbackRate
    this.audio.currentTime = this.video.currentTime

    // Если видео уже играет — запустить аудио
    if (!this.video.paused) {
      this.audio.play().catch((err) => {
        console.warn('[AudioSyncManager] Initial audio play failed:', err)
      })
    }

    // Подключаем события
    this.video.addEventListener('play', this.handlePlay)
    this.video.addEventListener('pause', this.handlePause)
    this.video.addEventListener('seeked', this.handleSeeked)
    this.video.addEventListener('ratechange', this.handleRateChange)
    this.video.addEventListener('volumechange', this.handleVolumeChange)
    this.video.addEventListener('timeupdate', this.handleTimeUpdate)

    this.isSyncing = true
  }

  /**
   * Одноразовая синхронизация времени
   */
  sync(): void {
    if (Math.abs(this.audio.currentTime - this.video.currentTime) > AUDIO_SYNC_THRESHOLD) {
      this.audio.currentTime = this.video.currentTime
    }
  }

  /**
   * Установить громкость
   */
  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume))
  }

  /**
   * Установить mute
   */
  setMuted(muted: boolean): void {
    this.audio.muted = muted
  }

  /**
   * Установить скорость воспроизведения
   */
  setPlaybackRate(rate: number): void {
    this.audio.playbackRate = rate
  }

  /**
   * Остановить синхронизацию и удалить слушатели
   */
  destroy(): void {
    if (this.isDestroyed) {
      return
    }
    this.isDestroyed = true

    if (this.isSyncing) {
      this.video.removeEventListener('play', this.handlePlay)
      this.video.removeEventListener('pause', this.handlePause)
      this.video.removeEventListener('seeked', this.handleSeeked)
      this.video.removeEventListener('ratechange', this.handleRateChange)
      this.video.removeEventListener('volumechange', this.handleVolumeChange)
      this.video.removeEventListener('timeupdate', this.handleTimeUpdate)
    }

    this.audio.pause()
  }

  // === Private handlers ===

  private onPlay(): void {
    this.audio.play().catch((err) => {
      console.warn('[AudioSyncManager] Audio play failed:', err)
    })
  }

  private onPause(): void {
    this.audio.pause()
  }

  private onSeeked(): void {
    this.audio.currentTime = this.video.currentTime
  }

  private onRateChange(): void {
    this.audio.playbackRate = this.video.playbackRate
  }

  private onVolumeChange(): void {
    this.audio.volume = this.video.volume
    // НЕ синхронизируем muted — видео заглушено специально
  }

  private onTimeUpdate(): void {
    this.sync()
  }
}
