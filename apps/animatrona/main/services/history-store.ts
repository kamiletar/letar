/**
 * Сервис хранения истории импортов
 *
 * История хранится в JSON файле в userData директории.
 * Максимум 100 записей, старые автоматически удаляются.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

import type {
  ImportHistoryCreateData,
  ImportHistoryEntry,
  ImportHistoryFilter,
  ImportHistoryStats,
} from '../../shared/types/import-history'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('HistoryStore')

const HISTORY_FILE = 'import-history.json'
const MAX_HISTORY_ENTRIES = 100

/**
 * Получить путь к файлу истории
 */
function getHistoryPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, HISTORY_FILE)
}

/**
 * Загрузить историю из файла
 */
function loadHistory(): ImportHistoryEntry[] {
  try {
    const filePath = getHistoryPath()
    if (!fs.existsSync(filePath)) {
      return []
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    log.error('Ошибка загрузки истории', { error })
    return []
  }
}

/**
 * Сохранить историю в файл
 */
function saveHistory(history: ImportHistoryEntry[]): void {
  try {
    const filePath = getHistoryPath()
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8')
  } catch (error) {
    log.error('Ошибка сохранения истории', { error })
    throw error
  }
}

/**
 * Получить все записи истории
 */
export function getAllHistory(): ImportHistoryEntry[] {
  return loadHistory()
}

/**
 * Получить записи с фильтрацией
 */
export function getHistory(filter?: ImportHistoryFilter): ImportHistoryEntry[] {
  let history = loadHistory()

  if (filter) {
    // Фильтр по статусу
    if (filter.status) {
      history = history.filter((h) => h.status === filter.status)
    }

    // Поиск по названию
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      history = history.filter(
        (h) => h.animeName.toLowerCase().includes(searchLower) || h.animeNameRu?.toLowerCase().includes(searchLower),
      )
    }

    // Фильтр по дате
    if (filter.fromDate) {
      const fromTime = new Date(filter.fromDate).getTime()
      history = history.filter((h) => new Date(h.completedAt).getTime() >= fromTime)
    }
    if (filter.toDate) {
      const toTime = new Date(filter.toDate).getTime()
      history = history.filter((h) => new Date(h.completedAt).getTime() <= toTime)
    }

    // Пагинация
    if (filter.offset) {
      history = history.slice(filter.offset)
    }
    if (filter.limit) {
      history = history.slice(0, filter.limit)
    }
  }

  return history
}

/**
 * Получить запись по ID
 */
export function getHistoryById(id: string): ImportHistoryEntry | undefined {
  const history = loadHistory()
  return history.find((h) => h.id === id)
}

/**
 * Добавить запись в историю
 */
export function addHistoryEntry(data: ImportHistoryCreateData): ImportHistoryEntry {
  const history = loadHistory()

  const newEntry: ImportHistoryEntry = {
    id: uuidv4(),
    ...data,
  }

  // Добавляем в начало (новые сверху)
  history.unshift(newEntry)

  // Ограничиваем количество записей
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.splice(MAX_HISTORY_ENTRIES)
  }

  saveHistory(history)
  log.info('Добавлена запись истории', { animeName: newEntry.animeName, status: newEntry.status })

  return newEntry
}

/**
 * Удалить запись из истории
 */
export function deleteHistoryEntry(id: string): boolean {
  const history = loadHistory()
  const index = history.findIndex((h) => h.id === id)

  if (index === -1) {
    return false
  }

  history.splice(index, 1)
  saveHistory(history)
  log.info('Удалена запись истории', { id })

  return true
}

/**
 * Очистить всю историю
 */
export function clearHistory(): void {
  saveHistory([])
  log.info('История очищена')
}

/**
 * Получить статистику истории
 */
export function getHistoryStats(): ImportHistoryStats {
  const history = loadHistory()

  const stats: ImportHistoryStats = {
    totalImports: history.length,
    successfulImports: 0,
    failedImports: 0,
    cancelledImports: 0,
    totalDurationMs: 0,
    avgDurationMs: 0,
    totalSizeBytes: 0,
    avgVmafScore: undefined,
  }

  let vmafSum = 0
  let vmafCount = 0

  for (const entry of history) {
    if (entry.status === 'completed') {
      stats.successfulImports++
    } else if (entry.status === 'error') {
      stats.failedImports++
    } else if (entry.status === 'cancelled') {
      stats.cancelledImports++
    }

    stats.totalDurationMs += entry.durationMs
    stats.totalSizeBytes += entry.totalSizeBytes ?? 0

    if (entry.vmafScore) {
      vmafSum += entry.vmafScore
      vmafCount++
    }
  }

  if (history.length > 0) {
    stats.avgDurationMs = Math.round(stats.totalDurationMs / history.length)
  }

  if (vmafCount > 0) {
    stats.avgVmafScore = Math.round((vmafSum / vmafCount) * 10) / 10
  }

  return stats
}

/**
 * Получить последние N записей
 */
export function getRecentHistory(limit = 5): ImportHistoryEntry[] {
  const history = loadHistory()
  return history.slice(0, limit)
}
