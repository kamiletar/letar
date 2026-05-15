/**
 * SubtitleManager — управление субтитрами
 *
 * Поддерживает:
 * - SRT → VTT конвертацию
 * - Нативные VTT субтитры через TextTrack
 * - ASS субтитры (требует внешний SubtitlesOctopus)
 */

import type { SubtitleRenderFormat } from '../types'
import { loadSubtitleAsVtt, revokeSubtitleUrl } from '../utils/srt-to-vtt'

/** Опции SubtitleManager */
export interface SubtitleManagerOptions {
  /** Video элемент */
  video: HTMLVideoElement
}

/**
 * Менеджер субтитров
 */
export class SubtitleManager {
  private video: HTMLVideoElement
  private vttUrl: string | null = null
  private currentFormat: SubtitleRenderFormat = null
  private isDestroyed = false

  constructor(options: SubtitleManagerOptions) {
    this.video = options.video
  }

  /**
   * Загрузить SRT или VTT субтитры
   *
   * @returns VTT blob URL или null
   */
  async loadNative(url: string): Promise<string | null> {
    if (this.isDestroyed) {
      return null
    }

    // Освобождаем предыдущий URL
    this.unload()

    try {
      const vttUrl = await loadSubtitleAsVtt(url)
      if (!vttUrl || this.isDestroyed) {
        return null
      }

      this.vttUrl = vttUrl
      this.currentFormat = 'native'

      // Добавляем track к video
      const track = document.createElement('track')
      track.kind = 'subtitles'
      track.label = 'Subtitles'
      track.srclang = 'ru'
      track.src = vttUrl
      this.video.appendChild(track)

      // Устанавливаем track в hidden mode (для cuechange)
      setTimeout(() => {
        if (this.video.textTracks.length > 0) {
          this.video.textTracks[0].mode = 'hidden'
        }
      }, 100)

      return vttUrl
    } catch (error) {
      console.error('[SubtitleManager] Load error:', error)
      return null
    }
  }

  /**
   * Показать субтитры
   */
  show(): void {
    if (this.video.textTracks.length > 0 && this.currentFormat === 'native') {
      this.video.textTracks[0].mode = 'showing'
    }
  }

  /**
   * Скрыть субтитры (но оставить активными для cuechange)
   */
  hide(): void {
    if (this.video.textTracks.length > 0) {
      this.video.textTracks[0].mode = 'hidden'
    }
  }

  /**
   * Выгрузить текущие субтитры
   */
  unload(): void {
    // Освобождаем blob URL
    revokeSubtitleUrl(this.vttUrl)
    this.vttUrl = null

    // Удаляем track элементы
    const tracks = this.video.querySelectorAll('track')
    tracks.forEach((track) => track.remove())

    this.currentFormat = null
  }

  /**
   * Получить текущий VTT URL
   */
  getVttUrl(): string | null {
    return this.vttUrl
  }

  /**
   * Получить текущий формат
   */
  getFormat(): SubtitleRenderFormat {
    return this.currentFormat
  }

  /**
   * Получить активные cues (для кастомного оверлея)
   */
  getActiveCues(): VTTCue[] {
    if (this.video.textTracks.length === 0) {
      return []
    }

    const track = this.video.textTracks[0]
    if (!track.activeCues) {
      return []
    }

    return Array.from(track.activeCues) as VTTCue[]
  }

  /**
   * Подписаться на cuechange
   */
  onCueChange(callback: (cues: VTTCue[]) => void): () => void {
    const handler = () => {
      callback(this.getActiveCues())
    }

    if (this.video.textTracks.length > 0) {
      this.video.textTracks[0].addEventListener('cuechange', handler)
    }

    return () => {
      if (this.video.textTracks.length > 0) {
        this.video.textTracks[0].removeEventListener('cuechange', handler)
      }
    }
  }

  /**
   * Уничтожить менеджер
   */
  destroy(): void {
    if (this.isDestroyed) {
      return
    }
    this.isDestroyed = true
    this.unload()
  }
}
