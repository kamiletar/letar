/**
 * JSON Store для данных федерации
 *
 * Хранит настройки федерации, трекеры и федеративный контент
 * в JSON файлах в userData директории.
 */

import { createJsonStore } from '@letar/electron-storage'
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

const FEDERATION_SUBDIR = 'federation'
const SETTINGS_FILE = 'federation-settings.json'
const TRACKERS_FILE = 'federation-trackers.json'
const CONTENT_FILE = 'federation-content.json'

const MAX_CONTENT_ENTRIES = 1000

// ============================================================================
// Утилиты файловой системы
// ============================================================================

/**
 * Гарантировать существование подпапки `federation` в userData.
 *
 * `createJsonStore` создаёт директорию только для своего корня (userData), а не
 * для вложенных подпапок в имени файла — подпапку создаём сами, перед каждой
 * записью (как раньше делала getFederationDir()). Чтению она не нужна: отсутствие
 * файла стор отдаёт дефолтом.
 */
function ensureFederationDir(): void {
  const dir = path.join(app.getPath('userData'), FEDERATION_SUBDIR)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
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

// mergeDefaults не используется — раньше loadJson на успешном чтении возвращал
// распарсенный JSON как есть, без слияния с дефолтами
const settingsStore = createJsonStore<StoredFederationSettings>(
  path.join(FEDERATION_SUBDIR, SETTINGS_FILE),
  DEFAULT_SETTINGS,
  { logger: log },
)
const trackersStore = createJsonStore<StoredTracker[]>(path.join(FEDERATION_SUBDIR, TRACKERS_FILE), [], {
  logger: log,
})
const contentStore = createJsonStore<StoredFederatedContent[]>(path.join(FEDERATION_SUBDIR, CONTENT_FILE), [], {
  logger: log,
})

/**
 * Обёртки записи. Подпапку `federation` библиотека не создаёт (её `ensureDir` покрывает
 * только корень userData), поэтому гарантия висит здесь, а не на том, что перед каждой
 * записью кто-то сделал чтение: первая же функция, пишущая без предварительного чтения,
 * иначе упала бы ENOENT на чистом профиле.
 */
function saveSettings(value: StoredFederationSettings): void {
  ensureFederationDir()
  settingsStore.saveSync(value)
}

function saveTrackers(value: StoredTracker[]): void {
  ensureFederationDir()
  trackersStore.saveSync(value)
}

function saveContent(value: StoredFederatedContent[]): void {
  ensureFederationDir()
  contentStore.saveSync(value)
}

/**
 * Получить настройки федерации
 */
export function getFederationSettings(): StoredFederationSettings {
  // Копия: без mergeDefaults фолбэк (нет файла) — это сама ссылка на DEFAULT_SETTINGS,
  // а не свежий объект; наружу её выпускать нельзя
  return { ...settingsStore.loadSync() }
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
  saveSettings(updated)
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
  saveSettings(updated)
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
  // Копия — раньше loadJson на фолбэке возвращал свежий литерал `[]` на
  // каждый вызов, а не переиспользованную ссылку из createJsonStore
  return [...trackersStore.loadSync()]
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
  saveTrackers(trackers)
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
  saveTrackers(trackers)
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
  saveTrackers(trackers)
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
  // Копия — раньше loadJson на фолбэке возвращал свежий литерал `[]` на
  // каждый вызов, а не переиспользованную ссылку из createJsonStore
  return [...contentStore.loadSync()]
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
    saveContent(content)
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

  saveContent(content)
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
    saveContent(filtered)
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
  // Единственный write-путь модуля без предварительного чтения через getAllFederatedContent() —
  // подпапку нужно гарантировать явно
  saveContent([])
  log.info('Весь федеративный контент очищен')
}
