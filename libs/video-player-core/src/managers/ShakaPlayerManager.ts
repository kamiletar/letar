/**
 * ShakaPlayerManager — управление Shaka Player
 *
 * Инкапсулирует:
 * - Программное создание video элемента
 * - Инициализацию Shaka Player
 * - Загрузку источника видео
 * - Lifecycle management
 */

import type shaka from 'shaka-player'

import type { PlayerAPI, PlayerOptions } from '../types'
import { toPlayableUrl } from '../utils/media-url'
import { PlayerEventEmitter } from './PlayerEventEmitter'

/** Опции для ShakaPlayerManager */
export interface ShakaPlayerManagerOptions extends PlayerOptions {
  /** Ref для раздельного audio (опционально) */
  audioElement?: HTMLAudioElement | null
  /** Используются раздельные аудиодорожки */
  usesSeparateAudio?: boolean
}

/**
 * Менеджер Shaka Player
 */
export class ShakaPlayerManager extends PlayerEventEmitter implements PlayerAPI {
  private container: HTMLElement
  private videoElement: HTMLVideoElement | null = null
  private player: shaka.Player | null = null
  private audioElement: HTMLAudioElement | null = null
  private usesSeparateAudio = false
  private isDestroyed = false

  constructor(options: ShakaPlayerManagerOptions) {
    super()
    this.container = options.container
    this.audioElement = options.audioElement ?? null
    this.usesSeparateAudio = options.usesSeparateAudio ?? false
  }

  /**
   * Инициализировать плеер и загрузить источник
   */
  async init(options: { src: string; startTime?: number; autoPlay?: boolean; Shaka: typeof shaka }): Promise<void> {
    const { src, startTime = 0, autoPlay = false, Shaka } = options

    if (this.isDestroyed) {
      throw new Error('Player is destroyed')
    }

    this.emit('loadingchange', { isLoading: true })

    // Создаём video элемент программно
    const video = document.createElement('video')
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = 'contain'
    video.crossOrigin = 'anonymous'
    video.onclick = (e) => e.stopPropagation()

    // В режиме раздельных дорожек video.muted = true
    video.muted = this.usesSeparateAudio

    // Добавляем в DOM
    this.container.appendChild(video)
    this.videoElement = video

    // Устанавливаем полифиллы Shaka
    Shaka.polyfill.installAll()

    // Проверяем поддержку браузера
    if (!Shaka.Player.isBrowserSupported()) {
      this.emit('error', { error: new Error('Browser not supported') })
      return
    }

    // Создаём плеер
    const player = new Shaka.Player()
    await player.attach(video)
    this.player = player

    // Обработка ошибок Shaka
    player.addEventListener('error', (event) => {
      if (this.isDestroyed) {
        return
      }
      const error = (event as unknown as { detail: shaka.util.Error }).detail
      console.error('[ShakaPlayerManager] Shaka error:', error)
      this.emit('error', { error: new Error(error.message || 'Playback error') })
    })

    // Подключаем события video элемента
    this.attachVideoEvents(video)

    // Загружаем источник
    try {
      const mediaUrl = toPlayableUrl({ path: src })
      if (!mediaUrl) {
        throw new Error('Invalid video source')
      }

      await player.load(mediaUrl, startTime)

      if (this.isDestroyed) {
        return
      }

      // Сигнализируем о готовности
      this.emit('durationchange', { duration: video.duration })
      this.emit('loadingchange', { isLoading: false })
      this.emit('ready')

      if (autoPlay) {
        video.play()
      }
    } catch (error) {
      if (this.isDestroyed) {
        return
      }

      // Игнорируем LOAD_INTERRUPTED (code 7002)
      const shakaError = error as { code?: number }
      if (shakaError.code === 7002) {
        return
      }

      console.error('[ShakaPlayerManager] Load error:', error)
      this.emit('loadingchange', { isLoading: false })
      this.emit('error', { error: error instanceof Error ? error : new Error(String(error)) })
    }
  }

  /**
   * Загрузить новый источник
   */
  async load(src: string, startTime?: number): Promise<void> {
    if (!this.player || !this.videoElement) {
      throw new Error('Player not initialized')
    }

    this.emit('loadingchange', { isLoading: true })

    try {
      const mediaUrl = toPlayableUrl({ path: src })
      if (!mediaUrl) {
        throw new Error('Invalid video source')
      }

      await this.player.load(mediaUrl, startTime)
      this.emit('durationchange', { duration: this.videoElement.duration })
      this.emit('loadingchange', { isLoading: false })
      this.emit('ready')
    } catch (error) {
      const shakaError = error as { code?: number }
      if (shakaError.code === 7002) {
        return
      }

      this.emit('loadingchange', { isLoading: false })
      throw error
    }
  }

  /**
   * Выгрузить текущий источник
   */
  async unload(): Promise<void> {
    if (this.player) {
      await this.player.unload()
    }
  }

  // === PlayerAPI ===

  play(): void {
    this.videoElement?.play()
  }

  pause(): void {
    this.videoElement?.pause()
  }

  seek(time: number): void {
    if (this.videoElement) {
      this.videoElement.currentTime = time
    }
  }

  getCurrentTime(): number {
    return this.videoElement?.currentTime ?? 0
  }

  getDuration(): number {
    return this.videoElement?.duration ?? 0
  }

  setVolume(volume: number): void {
    if (this.videoElement) {
      this.videoElement.volume = Math.max(0, Math.min(1, volume))
    }
  }

  getVolume(): number {
    return this.videoElement?.volume ?? 1
  }

  setPlaybackRate(rate: number): void {
    if (this.videoElement) {
      this.videoElement.playbackRate = rate
    }
    if (this.audioElement) {
      this.audioElement.playbackRate = rate
    }
  }

  getPlaybackRate(): number {
    return this.videoElement?.playbackRate ?? 1
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      this.container.requestFullscreen()
    }
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement
  }

  /**
   * Установить режим раздельных аудиодорожек
   */
  setSeparateAudioMode(enabled: boolean): void {
    this.usesSeparateAudio = enabled
    if (this.videoElement) {
      this.videoElement.muted = enabled
    }
  }

  /**
   * Уничтожить плеер и освободить ресурсы
   */
  destroy(): void {
    if (this.isDestroyed) {
      return
    }
    this.isDestroyed = true

    // Останавливаем воспроизведение
    this.videoElement?.pause()

    // Unload и destroy Shaka
    if (this.player) {
      this.player.unload()
      this.player.destroy()
      this.player = null
    }

    // Удаляем video element из DOM
    if (this.videoElement) {
      this.videoElement.remove()
      this.videoElement = null
    }

    // Очищаем подписки
    this.removeAllListeners()
  }

  /**
   * Подключить обработчики событий video элемента
   */
  private attachVideoEvents(video: HTMLVideoElement): void {
    video.addEventListener('timeupdate', () => {
      if (this.isDestroyed) {
        return
      }
      this.emit('timeupdate', { currentTime: video.currentTime, duration: video.duration })
    })

    video.addEventListener('play', () => {
      if (this.isDestroyed) {
        return
      }
      this.emit('play')
    })

    video.addEventListener('pause', () => {
      if (this.isDestroyed) {
        return
      }
      this.emit('pause')
    })

    video.addEventListener('ended', () => {
      if (this.isDestroyed) {
        return
      }
      this.emit('ended')
    })

    video.addEventListener('durationchange', () => {
      if (this.isDestroyed) {
        return
      }
      this.emit('durationchange', { duration: video.duration })
    })

    video.addEventListener('volumechange', () => {
      if (this.isDestroyed) {
        return
      }
      this.emit('volumechange', { volume: video.volume, muted: video.muted })
    })

    video.addEventListener('seeked', () => {
      if (this.isDestroyed) {
        return
      }
      this.emit('seeked', { currentTime: video.currentTime })
    })

    video.addEventListener('ratechange', () => {
      if (this.isDestroyed) {
        return
      }
      this.emit('ratechange', { playbackRate: video.playbackRate })
    })
  }
}
