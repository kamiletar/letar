/**
 * Publisher Config — Конфигурация публикации библиотеки
 *
 * Загрузка, сохранение и обновление конфигурации публикации.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('PublisherConfig')

export const PUBLISHER_CONFIG_FILE = 'publisher-config.json'

/**
 * Конфигурация публикации
 */
export interface PublisherConfig {
  /** Имя библиотеки (отображается подписчикам) */
  libraryName: string
  /** Включена ли публикация */
  enabled: boolean
  /** Последний опубликованный CID */
  lastPublishedCid: string | null
  /** Когда последний раз публиковали */
  lastPublishedAt: string | null
  /** Автопубликация при изменениях */
  autoPublish: boolean
}

export const DEFAULT_CONFIG: PublisherConfig = {
  libraryName: 'My Anime Library',
  enabled: false,
  lastPublishedCid: null,
  lastPublishedAt: null,
  autoPublish: false,
}

/**
 * Получить путь к файлу конфигурации
 */
function getConfigPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, PUBLISHER_CONFIG_FILE)
}

/**
 * Загрузить конфигурацию
 */
export function loadPublisherConfig(): PublisherConfig {
  try {
    const filePath = getConfigPath()
    if (!fs.existsSync(filePath)) {
      return { ...DEFAULT_CONFIG }
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) }
  } catch (error) {
    log.error('Ошибка загрузки конфигурации', { error: error instanceof Error ? error.message : String(error) })
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * Сохранить конфигурацию
 */
export function savePublisherConfig(config: PublisherConfig): void {
  try {
    const filePath = getConfigPath()
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    log.error('Ошибка сохранения конфигурации', { error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

/**
 * Обновить конфигурацию
 */
export function updatePublisherConfig(updates: Partial<PublisherConfig>): PublisherConfig {
  const config = loadPublisherConfig()
  const updated = { ...config, ...updates }
  savePublisherConfig(updated)
  return updated
}
