/**
 * TempFileManager — Менеджер временных файлов для экспорта
 *
 * Скачивает файлы из IPFS во временную директорию для операций,
 * которые требуют локальные пути (например FFmpeg -attach для шрифтов).
 *
 * Использование:
 * 1. Создать экземпляр: const manager = new TempFileManager()
 * 2. Скачать файлы: const path = await manager.downloadFromIpfs(cid, 'font.ttf')
 * 3. Использовать пути в FFmpeg
 * 4. Очистить: await manager.cleanup()
 */

import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'

import { createModuleLogger } from '../utils/logger'
import { saveToFile } from './ipfs/unixfs-service'

const log = createModuleLogger('TempFileManager')

/**
 * Менеджер временных файлов
 *
 * Каждый экземпляр создаёт уникальную поддиректорию внутри temp директории
 * для изоляции файлов разных операций экспорта.
 */
export class TempFileManager {
  /** Базовая директория для всех временных файлов */
  private static readonly BASE_TEMP_DIR = path.join(os.tmpdir(), 'animatrona-export')

  /** Уникальная директория для этого экземпляра */
  private readonly sessionDir: string

  /** Список скачанных файлов для cleanup */
  private downloadedFiles: string[] = []

  /** Флаг инициализации директории */
  private initialized = false

  constructor() {
    // Уникальная директория для этой сессии экспорта
    this.sessionDir = path.join(
      TempFileManager.BASE_TEMP_DIR,
      `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    )
  }

  /**
   * Инициализировать директорию (ленивая инициализация)
   */
  private async ensureDir(): Promise<void> {
    if (this.initialized) {
      return
    }

    await fs.mkdir(this.sessionDir, { recursive: true })
    this.initialized = true
    log.info('Создана директория', { sessionDir: this.sessionDir })
  }

  /**
   * Скачать файл из IPFS во временную директорию
   *
   * @param cid - CID файла в IPFS
   * @param filename - Имя файла (для сохранения)
   * @returns Локальный путь к файлу
   */
  async downloadFromIpfs(cid: string, filename: string): Promise<string> {
    await this.ensureDir()

    // Уникальное имя чтобы избежать коллизий
    const uniqueFilename = `${Date.now()}-${filename}`
    const tempPath = path.join(this.sessionDir, uniqueFilename)

    log.info('Скачиваю файл из IPFS', { cid, tempPath })

    await saveToFile(cid, tempPath)
    this.downloadedFiles.push(tempPath)

    return tempPath
  }

  /**
   * Скачать массив файлов из IPFS параллельно
   *
   * @param files - Массив {cid, filename}
   * @returns Массив локальных путей (в том же порядке)
   */
  async downloadMany(files: Array<{ cid: string; filename: string }>): Promise<string[]> {
    if (files.length === 0) {
      return []
    }

    // Параллельное скачивание — файлы независимы (шрифты, субтитры)
    return Promise.all(files.map((file) => this.downloadFromIpfs(file.cid, file.filename)))
  }

  /**
   * Получить путь к сессионной директории
   */
  getSessionDir(): string {
    return this.sessionDir
  }

  /**
   * Количество скачанных файлов
   */
  getDownloadedCount(): number {
    return this.downloadedFiles.length
  }

  /**
   * Удалить все временные файлы этой сессии
   */
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      return
    }

    try {
      // Удаляем всю сессионную директорию рекурсивно
      await fs.rm(this.sessionDir, { recursive: true, force: true })
      log.info('Удалено временных файлов', { count: this.downloadedFiles.length })

      this.downloadedFiles = []
      this.initialized = false
    } catch (error) {
      log.warn('Ошибка при очистке', { error })
      // Не бросаем ошибку — cleanup не должен ломать основной flow
    }
  }

  /**
   * Очистить старые сессии (старше 1 часа)
   * Статический метод для периодической очистки
   */
  static async cleanupStale(maxAgeMs = 3600000): Promise<number> {
    let cleanedCount = 0

    try {
      const baseDir = TempFileManager.BASE_TEMP_DIR

      // Проверяем существование базовой директории
      try {
        await fs.access(baseDir)
      } catch {
        return 0 // Директория не существует — нечего чистить
      }

      const entries = await fs.readdir(baseDir, { withFileTypes: true })
      const now = Date.now()

      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('session-')) {
          continue
        }

        // Извлекаем timestamp из имени директории
        const match = entry.name.match(/^session-(\d+)-/)
        if (!match) {
          continue
        }

        const timestamp = parseInt(match[1], 10)
        const age = now - timestamp

        if (age > maxAgeMs) {
          const dirPath = path.join(baseDir, entry.name)
          await fs.rm(dirPath, { recursive: true, force: true })
          cleanedCount++
          log.info('Удалена старая сессия', { session: entry.name })
        }
      }
    } catch (error) {
      log.warn('Ошибка при очистке старых сессий', { error })
    }

    return cleanedCount
  }
}
