/**
 * Статистика использования символов
 *
 * Подсчёт количества вставок каждого символа через AltGr.
 * Персистенция в %APPDATA%/KamiKeyThe/stats.json.
 * Lazy write: сохранение каждые 60 секунд или при shutdown, не при каждом символе.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** Счётчики использования символов: символ → количество */
const stats = new Map<string, number>()
let dirty = false
let flushTimer: ReturnType<typeof setInterval> | null = null

/** Путь к файлу статистики */
function getStatsPath(): string {
  const appData = process.env.APPDATA
  if (!appData) {
    return ''
  }
  return join(appData, 'KamiKeyThe', 'stats.json')
}

/** Загрузить статистику из файла */
function loadStats(): void {
  const path = getStatsPath()
  if (!path) {
    return
  }

  try {
    if (!existsSync(path)) {
      return
    }
    const raw = readFileSync(path, 'utf-8')
    const data = JSON.parse(raw) as Record<string, number>
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'number' && val > 0) {
        stats.set(key, val)
      }
    }
  } catch {
    // Ошибка чтения — начинаем с пустой статистики
  }
}

/** Сохранить статистику в файл (атомарно) */
function saveStats(): void {
  if (!dirty) {
    return
  }
  const path = getStatsPath()
  if (!path) {
    return
  }

  try {
    const dir = dirname(path)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const data: Record<string, number> = {}
    for (const [key, val] of stats) {
      data[key] = val
    }

    const tmpPath = path + '.tmp'
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
    renameSync(tmpPath, path)
    dirty = false
  } catch {
    // Ошибка записи — пропускаем
  }
}

/** Инициализировать статистику: загрузить из файла + запустить lazy write */
export function initStats(): void {
  loadStats()
  // Сохранять каждые 60 секунд
  flushTimer = setInterval(saveStats, 60_000)
}

/** Инкрементировать счётчик символа */
export function incrementStat(char: string): void {
  const current = stats.get(char) ?? 0
  stats.set(char, current + 1)
  dirty = true
}

/** Получить статистику (копия) */
export function getStats(): Map<string, number> {
  return new Map(stats)
}

/** Получить топ-N символов по количеству использований */
export function getTopStats(n: number): Array<{ char: string; count: number }> {
  return [...stats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([char, count]) => ({ char, count }))
}

/** Завершить работу статистики: сохранить + остановить таймер */
export function shutdownStats(): void {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  saveStats()
}
