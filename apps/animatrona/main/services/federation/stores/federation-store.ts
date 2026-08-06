/**
 * JSON Store для данных федерации
 *
 * Хранит настройки федерации, трекеры и федеративный контент
 * в JSON файлах в userData директории.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

import type {
  FederatedContentData,
  FederationSettings,
  TrackerData,
  TrustLevel,
} from '../../../../shared/types/federation'
import { createModuleLogger } from '../../../utils/logger'

const log = createModuleLogger('FederationStore')

// ============================================================================
// Типы данных для хранения
// ============================================================================

/**
 * Данные трекера для хранения (без методов)
 */
export interface StoredTracker extends TrackerData {
  id: string
  createdAt: string
  updatedAt: string
}

/**
 * Данные федеративного контента для хранения
 */
export interface StoredFederatedContent extends FederatedContentData {
  id: string
  receivedAt: string
}

/**
 * Настройки федерации для хранения
 */
export interface StoredFederationSettings extends FederationSettings {
  privateKeyPem?: string
}

// ============================================================================
// Константы
// ============================================================================

const SETTINGS_FILE = 'federation-settings.json'
const TRACKERS_FILE = 'federation-trackers.json'
const CONTENT_FILE = 'federation-content.json'

const MAX_CONTENT_ENTRIES = 1000

// ============================================================================
// Утилиты файловой системы
// ============================================================================

/**
 * Получить путь к директории федерации
 */
function getFederationDir(): string {
  const userDataPath = app.getPath('userData')
  const federationDir = path.join(userDataPath, 'federation')
  if (!fs.existsSync(federationDir)) {
    fs.mkdirSync(federationDir, { recursive: true })
  }
  return federationDir
}

/**
 * Загрузить JSON файл
 */
function loadJson<T>(filename: string, defaultValue: T): T {
  try {
    const filePath = path.join(getFederationDir(), filename)
    if (!fs.existsSync(filePath)) {
      return defaultValue
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    log.error(`Ошибка загрузки ${filename}`, { error })
    return defaultValue
  }
}

/**
 * Сохранить JSON файл
 */
function saveJson<T>(filename: string, data: T): void {
  try {
    const filePath = path.join(getFederationDir(), filename)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    log.error(`Ошибка сохранения ${filename}`, { error })
    throw error
  }
}

// ============================================================================
// Settings Store
// ============================================================================

const DEFAULT_SETTINGS: StoredFederationSettings = {
  enabled: false,
  trackerName: 'My Animatrona',
  theme: 'anime',
  language: 'ru',
  autoSync: true,
  syncIntervalMinutes: 60,
  minTrustForAutoImport: 2,
  hasPrivateKey: false,
}

/**
 * Получить настройки федерации
 */
export function getFederationSettings(): StoredFederationSettings {
  return loadJson<StoredFederationSettings>(SETTINGS_FILE, DEFAULT_SETTINGS)
}

/**
 * Обновить настройки федерации
 */
export function updateFederationSettings(
  update: Partial<Omit<StoredFederationSettings, 'hasPrivateKey'>>,
): StoredFederationSettings {
  const current = getFederationSettings()
  const updated: StoredFederationSettings = {
    ...current,
    ...update,
  }
  saveJson(SETTINGS_FILE, updated)
  log.info('Настройки обновлены')
  return updated
}

/**
 * Сохранить ключи
 */
export function saveKeys(privateKeyPem: string, publicKeyPem: string): void {
  const current = getFederationSettings()
  const updated: StoredFederationSettings = {
    ...current,
    privateKeyPem,
    publicKeyPem,
    hasPrivateKey: true,
  }
  saveJson(SETTINGS_FILE, updated)
  log.info('Ключи сохранены')
}

/**
 * Получить приватный ключ
 */
export function getPrivateKey(): string | undefined {
  const settings = getFederationSettings()
  return settings.privateKeyPem
}

/**
 * Получить публичный ключ
 */
export function getPublicKey(): string | undefined {
  const settings = getFederationSettings()
  return settings.publicKeyPem
}

// ============================================================================
// Trackers Store
// ============================================================================

/**
 * Получить все трекеры
 */
export function getAllTrackers(): StoredTracker[] {
  return loadJson<StoredTracker[]>(TRACKERS_FILE, [])
}

/**
 * Получить трекер по ID
 */
export function getTrackerById(id: string): StoredTracker | undefined {
  const trackers = getAllTrackers()
  return trackers.find((t) => t.id === id)
}

/**
 * Получить трекер по URL
 */
export function getTrackerByUrl(url: string): StoredTracker | undefined {
  const trackers = getAllTrackers()
  return trackers.find((t) => t.url === url)
}

/**
 * Добавить трекер
 */
export function addTracker(data: TrackerData): StoredTracker {
  const trackers = getAllTrackers()

  // Проверяем уникальность URL
  if (trackers.some((t) => t.url === data.url)) {
    throw new Error(`Трекер с URL ${data.url} уже существует`)
  }

  const now = new Date().toISOString()
  const newTracker: StoredTracker = {
    id: uuidv4(),
    ...data,
    createdAt: now,
    updatedAt: now,
  }

  trackers.push(newTracker)
  saveJson(TRACKERS_FILE, trackers)
  log.info('Добавлен трекер', { name: data.name, url: data.url })

  return newTracker
}

/**
 * Обновить трекер
 */
export function updateTracker(id: string, update: Partial<TrackerData>): StoredTracker | undefined {
  const trackers = getAllTrackers()
  const index = trackers.findIndex((t) => t.id === id)

  if (index === -1) {
    return undefined
  }

  const updated: StoredTracker = {
    ...trackers[index],
    ...update,
    updatedAt: new Date().toISOString(),
  }

  trackers[index] = updated
  saveJson(TRACKERS_FILE, trackers)
  log.info('Обновлён трекер', { name: updated.name })

  return updated
}

/**
 * Удалить трекер
 */
export function removeTracker(id: string): boolean {
  const trackers = getAllTrackers()
  const index = trackers.findIndex((t) => t.id === id)

  if (index === -1) {
    return false
  }

  const removed = trackers.splice(index, 1)[0]
  saveJson(TRACKERS_FILE, trackers)
  log.info('Удалён трекер', { name: removed.name })

  return true
}

/**
 * Установить уровень доверия
 */
export function setTrackerTrust(id: string, trustLevel: TrustLevel): StoredTracker | undefined {
  return updateTracker(id, { trustLevel })
}

/**
 * Обновить метрики трекера
 */
export function updateTrackerMetrics(
  id: string,
  metrics: {
    uptimePercent?: number
    avgResponseTimeMs?: number
    contentQuality?: number
    lastCheckedAt?: string
  },
): StoredTracker | undefined {
  return updateTracker(id, metrics)
}

/**
 * Обновить статистику синхронизации
 */
export function updateTrackerSyncStats(
  id: string,
  stats: {
    contentSynced?: number
    lastSyncAt?: string
  },
): StoredTracker | undefined {
  return updateTracker(id, stats)
}

/**
 * Получить трекеры с минимальным уровнем доверия
 */
export function getTrustedTrackers(minTrust: TrustLevel): StoredTracker[] {
  const trackers = getAllTrackers()
  return trackers.filter((t) => t.trustLevel >= minTrust && !t.isBlocked)
}

/**
 * Заблокировать трекер
 */
export function blockTracker(id: string): StoredTracker | undefined {
  return updateTracker(id, { isBlocked: true, trustLevel: 0 })
}

/**
 * Разблокировать трекер
 */
export function unblockTracker(id: string): StoredTracker | undefined {
  return updateTracker(id, { isBlocked: false, trustLevel: 1 })
}

// ============================================================================
// Federated Content Store
// ============================================================================

/**
 * Получить весь федеративный контент
 */
export function getAllFederatedContent(): StoredFederatedContent[] {
  return loadJson<StoredFederatedContent[]>(CONTENT_FILE, [])
}

/**
 * Получить контент по трекеру
 */
export function getFederatedContentByTracker(trackerId: string): StoredFederatedContent[] {
  const content = getAllFederatedContent()
  return content.filter((c) => c.trackerId === trackerId)
}

/**
 * Добавить федеративный контент
 */
export function addFederatedContent(data: FederatedContentData): StoredFederatedContent {
  const content = getAllFederatedContent()

  // Проверяем уникальность по trackerId + remoteId
  const existingIndex = content.findIndex((c) => c.trackerId === data.trackerId && c.remoteId === data.remoteId)

  const now = new Date().toISOString()

  if (existingIndex !== -1) {
    // Обновляем существующий
    const updated: StoredFederatedContent = {
      ...content[existingIndex],
      ...data,
      receivedAt: now,
    }
    content[existingIndex] = updated
    saveJson(CONTENT_FILE, content)
    return updated
  }

  // Добавляем новый
  const newContent: StoredFederatedContent = {
    id: uuidv4(),
    ...data,
    receivedAt: now,
  }

  content.unshift(newContent)

  // Ограничиваем количество записей
  if (content.length > MAX_CONTENT_ENTRIES) {
    content.splice(MAX_CONTENT_ENTRIES)
  }

  saveJson(CONTENT_FILE, content)
  log.info('Добавлен контент', { remoteId: data.remoteId, trackerId: data.trackerId })

  return newContent
}

/**
 * Удалить контент трекера
 */
export function removeFederatedContentByTracker(trackerId: string): number {
  const content = getAllFederatedContent()
  const filtered = content.filter((c) => c.trackerId !== trackerId)
  const removed = content.length - filtered.length

  if (removed > 0) {
    saveJson(CONTENT_FILE, filtered)
    log.info('Удалён контент трекера', { trackerId, count: removed })
  }

  return removed
}

/**
 * Найти контент по MAL ID
 */
export function findContentByMalId(malId: number): StoredFederatedContent[] {
  const content = getAllFederatedContent()
  return content.filter((c) => c.malId === malId)
}

/**
 * Найти контент по AniList ID
 */
export function findContentByAnilistId(anilistId: number): StoredFederatedContent[] {
  const content = getAllFederatedContent()
  return content.filter((c) => c.anilistId === anilistId)
}

/**
 * Очистить весь контент
 */
export function clearAllFederatedContent(): void {
  saveJson(CONTENT_FILE, [])
  log.info('Весь федеративный контент очищен')
}
