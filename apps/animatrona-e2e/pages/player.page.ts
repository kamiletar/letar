/**
 * Page Object для страницы плеера.
 *
 * Поддерживает два режима:
 * 1. Folder Player (/player) — воспроизведение локальных файлов
 * 2. Watch Page (/watch/[episodeId]) — воспроизведение эпизодов из БД
 */

import type { Locator, Page } from 'playwright'
import { BasePage } from './base.page'

export class PlayerPage extends BasePage {
  /** Кнопка "Выбрать файл" */
  readonly selectFileButton: Locator

  /** Кнопка "Выбрать папку" */
  readonly selectFolderButton: Locator

  /** Video элемент */
  readonly video: Locator

  /** Контейнер Shaka Player */
  readonly shakaContainer: Locator

  /** Sidebar с эпизодами (в folder режиме) */
  readonly episodesSidebar: Locator

  constructor(page: Page) {
    super(page)
    this.selectFileButton = page.getByRole('button', { name: /выбрать файл/i })
    this.selectFolderButton = page.getByRole('button', { name: /выбрать папку/i })
    this.video = page.locator('video')
    this.shakaContainer = page.locator('.shaka-video-container, [data-testid="video-player"]')
    this.episodesSidebar = page.getByRole('complementary')
  }

  /**
   * Проверить загружена ли страница плеера
   */
  async isLoaded(): Promise<boolean> {
    const hasSelectFile = await this.selectFileButton.isVisible().catch(() => false)
    const hasSelectFolder = await this.selectFolderButton.isVisible().catch(() => false)
    const hasVideo = (await this.video.count()) > 0

    return hasSelectFile || hasSelectFolder || hasVideo
  }

  /**
   * Кликнуть "Выбрать файл"
   */
  async clickSelectFile(): Promise<boolean> {
    const isVisible = await this.selectFileButton.isVisible().catch(() => false)
    if (!isVisible) {
      return false
    }

    await this.selectFileButton.click()
    return true
  }

  /**
   * Кликнуть "Выбрать папку"
   */
  async clickSelectFolder(): Promise<boolean> {
    const isVisible = await this.selectFolderButton.isVisible().catch(() => false)
    if (!isVisible) {
      return false
    }

    await this.selectFolderButton.click()
    return true
  }

  /**
   * Проверить что видео загружено
   */
  async isVideoLoaded(): Promise<boolean> {
    const hasVideo = (await this.video.count()) > 0
    const hasShaka = (await this.shakaContainer.count()) > 0
    return hasVideo || hasShaka
  }

  /**
   * Ждать загрузки видео
   */
  async waitForVideoLoad(timeout = 10000): Promise<void> {
    await Promise.race([
      this.video.waitFor({ state: 'visible', timeout }),
      this.shakaContainer.waitFor({ state: 'visible', timeout }),
    ])
  }

  /**
   * Проверить папочный режим (sidebar с эпизодами)
   */
  async isFolderMode(): Promise<boolean> {
    return this.episodesSidebar.isVisible().catch(() => false)
  }

  // ==================== Playback Controls ====================

  /**
   * Play/Pause кнопка
   */
  get playPauseButton(): Locator {
    return this.page.getByRole('button', { name: /play|pause|воспроизвести|пауза/i })
  }

  /**
   * Кнопка полноэкранного режима
   */
  get fullscreenButton(): Locator {
    return this.page.getByRole('button', { name: /fullscreen|полный экран/i })
  }

  /**
   * Нажать Play/Pause
   */
  async togglePlayPause(): Promise<void> {
    await this.playPauseButton.click()
  }

  /**
   * Получить текущее время воспроизведения
   */
  async getCurrentTime(): Promise<number> {
    return this.video.evaluate((el: HTMLVideoElement) => el.currentTime).catch(() => 0)
  }

  /**
   * Получить длительность видео
   */
  async getDuration(): Promise<number> {
    return this.video.evaluate((el: HTMLVideoElement) => el.duration).catch(() => 0)
  }

  /**
   * Проверить воспроизводится ли видео
   */
  async isPlaying(): Promise<boolean> {
    return this.video.evaluate((el: HTMLVideoElement) => !el.paused).catch(() => false)
  }

  // ==================== Subtitles ====================

  /**
   * Кнопка субтитров
   */
  get subtitlesButton(): Locator {
    return this.page.getByRole('button', { name: /субтитры|subtitles|cc/i })
  }

  /**
   * Проверить есть ли субтитры
   */
  async hasSubtitles(): Promise<boolean> {
    return this.subtitlesButton.isVisible().catch(() => false)
  }

  // ==================== Audio Tracks ====================

  /**
   * Кнопка аудиодорожек
   */
  get audioTracksButton(): Locator {
    return this.page.getByRole('button', { name: /аудио|audio|дорожк/i })
  }

  /**
   * Проверить есть ли выбор аудиодорожек
   */
  async hasAudioTracks(): Promise<boolean> {
    return this.audioTracksButton.isVisible().catch(() => false)
  }
}
