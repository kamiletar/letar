/**
 * Stats Store — Персистентное хранилище статистики пользователя
 *
 * Хранит статистику в JSON файле в userData директории (main process).
 * Использует строки для BigInt совместимости с БД.
 * Поддерживает историю по дням (последние 30 дней).
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import type { DailyStats, StatsReportDelta, UserStats } from '../../../shared/types/stats'
import { INITIAL_USER_STATS } from '../../../shared/types/stats'
import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('StatsStore')

const STATS_FILE = 'user-stats.json'
const MAX_DAILY_HISTORY = 30 // Хранить 30 дней
const MAX_KNOWN_PEERS = 5000 // Лимит knownBitswapPeers для предотвращения утечки памяти

// ============================================================================
// Helpers для работы с BigInt как string
// ============================================================================

/**
 * Сложить два BigInt в строковом формате
 */
function addBigIntStrings(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString()
}

/**
 * Получить путь к файлу статистики
 */
function getStatsPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, STATS_FILE)
}

/**
 * Получить текущую дату в формате YYYY-MM-DD
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Загрузить статистику из файла
 */
export function loadStats(): UserStats {
  try {
    const filePath = getStatsPath()
    if (!fs.existsSync(filePath)) {
      return { ...INITIAL_USER_STATS }
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    const stats = JSON.parse(data) as UserStats

    // Миграция: добавляем недостающие поля и конвертируем number в string
    return {
      ...INITIAL_USER_STATS,
      ...stats,
      // Убедимся что BigInt поля — строки
      bytesUploaded: String(stats.bytesUploaded ?? '0'),
      bytesDownloaded: String(stats.bytesDownloaded ?? '0'),
      totalSeedingTimeMs: String(stats.totalSeedingTimeMs ?? '0'),
      currentSessionMs: String(stats.currentSessionMs ?? '0'),
      // Миграция: knownBitswapPeers
      knownBitswapPeers: Array.isArray(stats.knownBitswapPeers) ? stats.knownBitswapPeers : [],
      // Миграция: сброс невалидного peersHelped (был на основе swarm peers)
      // Теперь peersHelped = knownBitswapPeers.length (пересчитывается)
      peersHelped: Array.isArray(stats.knownBitswapPeers) ? stats.knownBitswapPeers.length : 0,
      // Миграция lastReported полей
      lastReportedBytesUploaded: String(stats.lastReportedBytesUploaded ?? '0'),
      lastReportedBytesDownloaded: String(stats.lastReportedBytesDownloaded ?? '0'),
      lastReportedSeedingTimeMs: String(stats.lastReportedSeedingTimeMs ?? '0'),
      lastReportedPeersHelped: Array.isArray(stats.knownBitswapPeers)
        ? Math.min(stats.lastReportedPeersHelped ?? 0, stats.knownBitswapPeers.length)
        : 0,
      // Миграция: аптайм
      totalUptimeMs: String(stats.totalUptimeMs ?? '0'),
      lastReportedUptimeMs: String(stats.lastReportedUptimeMs ?? '0'),
    }
  } catch (error) {
    log.error('Ошибка загрузки статистики', { error })
    return { ...INITIAL_USER_STATS }
  }
}

/**
 * Сохранить статистику в файл
 */
export function saveStats(stats: UserStats): void {
  try {
    const filePath = getStatsPath()
    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2), 'utf-8')
  } catch (error) {
    log.error('Ошибка сохранения статистики', { error })
    throw error
  }
}

/**
 * Получить или создать запись за сегодня
 */
function getOrCreateTodayStats(stats: UserStats): DailyStats {
  const today = getCurrentDate()
  let todayStats = stats.dailyStats.find((d) => d.date === today)

  if (!todayStats) {
    todayStats = {
      date: today,
      bytesUploaded: '0',
      bytesDownloaded: '0',
      seedingTimeMs: '0',
      peersHelped: 0,
    }
    stats.dailyStats.push(todayStats)

    // Ограничиваем историю
    if (stats.dailyStats.length > MAX_DAILY_HISTORY) {
      stats.dailyStats = stats.dailyStats.slice(-MAX_DAILY_HISTORY)
    }
  }

  return todayStats
}

/**
 * Добавить байты upload
 */
export function addBytesUploaded(bytes: number): UserStats {
  const stats = loadStats()
  const bytesStr = String(bytes)

  stats.bytesUploaded = addBigIntStrings(stats.bytesUploaded, bytesStr)
  stats.lastActiveAt = new Date().toISOString()

  // Обновляем дневную статистику
  const todayStats = getOrCreateTodayStats(stats)
  todayStats.bytesUploaded = addBigIntStrings(todayStats.bytesUploaded, bytesStr)

  // Если это первый upload — фиксируем дату
  if (!stats.firstSeedAt) {
    stats.firstSeedAt = new Date().toISOString()
  }

  saveStats(stats)
  return stats
}

/**
 * Добавить байты download
 */
export function addBytesDownloaded(bytes: number): UserStats {
  const stats = loadStats()
  const bytesStr = String(bytes)

  stats.bytesDownloaded = addBigIntStrings(stats.bytesDownloaded, bytesStr)
  stats.lastActiveAt = new Date().toISOString()

  // Обновляем дневную статистику
  const todayStats = getOrCreateTodayStats(stats)
  todayStats.bytesDownloaded = addBigIntStrings(todayStats.bytesDownloaded, bytesStr)

  saveStats(stats)
  return stats
}

/**
 * Добавить время раздачи
 */
export function addSeedingTime(ms: number): UserStats {
  const stats = loadStats()
  const msStr = String(ms)

  stats.totalSeedingTimeMs = addBigIntStrings(stats.totalSeedingTimeMs, msStr)
  stats.lastActiveAt = new Date().toISOString()

  // Обновляем дневную статистику
  const todayStats = getOrCreateTodayStats(stats)
  todayStats.seedingTimeMs = addBigIntStrings(todayStats.seedingTimeMs, msStr)

  saveStats(stats)
  return stats
}

/**
 * Добавить Bitswap пиров — возвращает количество новых уникальных пиров
 *
 * Принимает массив PeerID из bitswap/stat API, сравнивает с knownBitswapPeers Set,
 * добавляет новых и обновляет peersHelped.
 */
export function addBitswapPeers(peerIds: string[]): { stats: UserStats; newCount: number } {
  const stats = loadStats()
  const knownSet = new Set(stats.knownBitswapPeers)
  const sizeBefore = knownSet.size

  for (const peerId of peerIds) {
    knownSet.add(peerId)
  }

  const newCount = knownSet.size - sizeBefore
  if (newCount === 0) {
    return { stats, newCount: 0 }
  }

  // Ограничиваем массив пиров для предотвращения утечки памяти
  const allPeers = Array.from(knownSet)
  stats.knownBitswapPeers = allPeers.length > MAX_KNOWN_PEERS ? allPeers.slice(-MAX_KNOWN_PEERS) : allPeers
  stats.peersHelped = knownSet.size // Общее количество (не ограничиваем счётчик)
  stats.lastActiveAt = new Date().toISOString()

  // Обновляем дневную статистику
  const todayStats = getOrCreateTodayStats(stats)
  todayStats.peersHelped += newCount

  saveStats(stats)
  return { stats, newCount }
}

/**
 * Установить количество уникального контента
 */
export function setUniqueContentCount(count: number): UserStats {
  const stats = loadStats()

  stats.uniqueContentSeeded = count
  stats.lastActiveAt = new Date().toISOString()

  saveStats(stats)
  return stats
}

/**
 * Обновить время текущей сессии
 */
export function updateCurrentSession(ms: number): UserStats {
  const stats = loadStats()

  stats.currentSessionMs = String(ms)
  stats.lastActiveAt = new Date().toISOString()

  saveStats(stats)
  return stats
}

/**
 * Сбросить сессию (при старте/остановке ноды)
 */
export function resetCurrentSession(): UserStats {
  const stats = loadStats()
  stats.currentSessionMs = '0'
  saveStats(stats)
  return stats
}

/**
 * Получить статистику за период
 */
export function getDailyHistory(days = 30): DailyStats[] {
  const stats = loadStats()
  return stats.dailyStats.slice(-days)
}

/**
 * Добавить время аптайма приложения
 */
export function addUptime(ms: number): UserStats {
  const stats = loadStats()
  stats.totalUptimeMs = addBigIntStrings(stats.totalUptimeMs, String(ms))
  saveStats(stats)
  return stats
}

/**
 * Получить неотправленную дельту статистики (разница между текущими и lastReported значениями)
 */
export function getUnreportedDelta(activeDistributions: number): StatsReportDelta {
  const stats = loadStats()

  const bytesUploaded = Number(BigInt(stats.bytesUploaded) - BigInt(stats.lastReportedBytesUploaded))
  const bytesDownloaded = Number(BigInt(stats.bytesDownloaded) - BigInt(stats.lastReportedBytesDownloaded))
  const seedingTimeMs = Number(BigInt(stats.totalSeedingTimeMs) - BigInt(stats.lastReportedSeedingTimeMs))
  const peersHelped = stats.peersHelped - stats.lastReportedPeersHelped
  const uptimeMs = Number(BigInt(stats.totalUptimeMs) - BigInt(stats.lastReportedUptimeMs))

  return {
    bytesUploaded: Math.max(0, bytesUploaded),
    bytesDownloaded: Math.max(0, bytesDownloaded),
    seedingTimeMs: Math.max(0, seedingTimeMs),
    peersHelped: Math.max(0, peersHelped),
    activeDistributions,
    uptimeMs: Math.max(0, uptimeMs),
  }
}

/**
 * Отметить текущие значения как отправленные на трекер
 */
export function markReported(): void {
  const stats = loadStats()
  stats.lastReportedBytesUploaded = stats.bytesUploaded
  stats.lastReportedBytesDownloaded = stats.bytesDownloaded
  stats.lastReportedSeedingTimeMs = stats.totalSeedingTimeMs
  stats.lastReportedPeersHelped = stats.peersHelped
  stats.lastReportedUptimeMs = stats.totalUptimeMs
  saveStats(stats)
}

/**
 * Полный сброс статистики (для тестов)
 */
export function resetStats(): UserStats {
  const stats = { ...INITIAL_USER_STATS }
  saveStats(stats)
  log.info('Статистика сброшена')
  return stats
}
