/**
 * Утилита для создания JSON config store в userData
 *
 * Убирает дублирование getConfigPath/load/save паттерна
 * в tracker.handlers.ts, pinata-service.ts и т.д.
 */

import { app } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import { createModuleLogger } from './logger'

const log = createModuleLogger('ConfigStore')

export interface ConfigStore<T> {
  /** Загрузить конфигурацию async (defaults + merge с файлом) */
  load(): Promise<T>
  /** Загрузить синхронно — ТОЛЬКО при startup до event loop */
  loadSync(): T
  /** Сохранить конфигурацию async */
  save(data: T): Promise<void>
  /** Обновить часть конфигурации (merge) */
  update(updates: Partial<T>): Promise<T>
  /** Путь к файлу конфигурации */
  getPath(): string
}

/**
 * Создать config store для JSON файла в userData
 *
 * @param filename — имя файла (например 'tracker-config.json')
 * @param defaults — дефолтная конфигурация
 *
 * @example
 * const trackerConfig = createConfigStore('tracker-config.json', {
 *   baseUrl: 'https://animatrona-tracker.letar.best',
 *   apiKey: '',
 *   enabled: false,
 * })
 *
 * const config = await trackerConfig.load()
 * await trackerConfig.update({ apiKey: 'new-key' })
 */
export function createConfigStore<T extends Record<string, unknown>>(filename: string, defaults: T): ConfigStore<T> {
  function getPath(): string {
    return path.join(app.getPath('userData'), filename)
  }

  /** Синхронная загрузка — ТОЛЬКО при startup до event loop */
  function loadSync(): T {
    try {
      const filePath = getPath()
      if (existsSync(filePath)) {
        const data = readFileSync(filePath, 'utf-8')
        return { ...defaults, ...JSON.parse(data) }
      }
    } catch (error) {
      log.error(`Ошибка загрузки конфигурации ${filename}`, { error })
    }
    return { ...defaults }
  }

  async function load(): Promise<T> {
    try {
      const filePath = getPath()
      const data = await readFile(filePath, 'utf-8')
      return { ...defaults, ...JSON.parse(data) }
    } catch (error) {
      // ENOENT — файл не существует, не логируем
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.error(`Ошибка загрузки конфигурации ${filename}`, { error })
      }
    }
    return { ...defaults }
  }

  async function save(data: T): Promise<void> {
    try {
      const filePath = getPath()
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      log.error(`Ошибка сохранения конфигурации ${filename}`, { error })
    }
  }

  async function update(updates: Partial<T>): Promise<T> {
    const current = await load()
    const updated = { ...current, ...updates }
    await save(updated)
    return updated
  }

  return { load, loadSync, save, update, getPath }
}
