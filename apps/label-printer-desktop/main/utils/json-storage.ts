/**
 * Утилита для работы с JSON-хранилищем в файловой системе
 * Устраняет дублирование кода в database.handlers.ts, profiles.handlers.ts, export.handlers.ts
 */
import { Logger } from '@letar/label-printer-core'
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import * as fs from 'fs/promises'
import { join } from 'path'

const getLogger = () => Logger.getInstance()

/**
 * Универсальный класс для работы с JSON-хранилищем
 */
export class JsonStorage<T> {
  private readonly filePath: string
  private readonly defaultValue: T
  private cachedData: T | null = null
  private cacheExpiry = 0
  private readonly cacheTtlMs: number

  constructor(filename: string, defaultValue: T, options: { cacheTtlMs?: number } = {}) {
    const dataPath = app.isPackaged ? app.getPath('userData') : join(__dirname, '../../prisma/data')

    // Создаём директорию если не существует
    if (!existsSync(dataPath)) {
      mkdirSync(dataPath, { recursive: true })
    }

    this.filePath = join(dataPath, filename)
    this.defaultValue = defaultValue
    this.cacheTtlMs = options.cacheTtlMs ?? 0 // 0 = без кеша
  }

  /**
   * Получить путь к файлу
   */
  getPath(): string {
    return this.filePath
  }

  /**
   * Синхронно загрузить данные (для обратной совместимости)
   */
  loadSync(): T {
    // Проверяем кеш
    if (this.cachedData !== null && Date.now() < this.cacheExpiry) {
      return this.cachedData
    }

    if (!existsSync(this.filePath)) {
      return this.defaultValue
    }

    try {
      const data = readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(data) as T

      // Обновляем кеш
      if (this.cacheTtlMs > 0) {
        this.cachedData = parsed
        this.cacheExpiry = Date.now() + this.cacheTtlMs
      }

      return parsed
    } catch (error) {
      getLogger().error('[JsonStorage]', `Failed to load ${this.filePath}`, error)
      return this.defaultValue
    }
  }

  /**
   * Асинхронно загрузить данные
   */
  async load(): Promise<T> {
    // Проверяем кеш
    if (this.cachedData !== null && Date.now() < this.cacheExpiry) {
      return this.cachedData
    }

    if (!existsSync(this.filePath)) {
      return this.defaultValue
    }

    try {
      const data = await fs.readFile(this.filePath, 'utf-8')
      const parsed = JSON.parse(data) as T

      // Обновляем кеш
      if (this.cacheTtlMs > 0) {
        this.cachedData = parsed
        this.cacheExpiry = Date.now() + this.cacheTtlMs
      }

      return parsed
    } catch (error) {
      getLogger().error('[JsonStorage]', `Failed to load ${this.filePath}`, error)
      return this.defaultValue
    }
  }

  /**
   * Синхронно сохранить данные
   */
  saveSync(data: T): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(data, null, 2))

      // Инвалидируем кеш после записи
      if (this.cacheTtlMs > 0) {
        this.cachedData = data
        this.cacheExpiry = Date.now() + this.cacheTtlMs
      }
    } catch (error) {
      getLogger().error('[JsonStorage]', `Failed to save ${this.filePath}`, error)
      throw error
    }
  }

  /**
   * Асинхронно сохранить данные
   */
  async save(data: T): Promise<void> {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2))

      // Инвалидируем кеш после записи
      if (this.cacheTtlMs > 0) {
        this.cachedData = data
        this.cacheExpiry = Date.now() + this.cacheTtlMs
      }
    } catch (error) {
      getLogger().error('[JsonStorage]', `Failed to save ${this.filePath}`, error)
      throw error
    }
  }

  /**
   * Инвалидировать кеш
   */
  invalidateCache(): void {
    this.cachedData = null
    this.cacheExpiry = 0
  }

  /**
   * Проверить существует ли файл
   */
  exists(): boolean {
    return existsSync(this.filePath)
  }
}
