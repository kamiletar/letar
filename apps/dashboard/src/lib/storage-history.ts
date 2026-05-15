import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

const dashboardDataDir = process.env.DASHBOARD_DATA_DIR || path.join(process.cwd(), 'dashboard-data')
const STORAGE_DIR = path.join(dashboardDataDir, 'storage')

// Сохраняем статистику хранилища раз в час, храним 30 дней = 720 точек
const COLLECTION_INTERVAL_MS = 60 * 60 * 1000 // 1 час
const MAX_HISTORY_POINTS = 720 // 30 дней при часовых интервалах

export interface StoragePoint {
  timestamp: number
  uploads: number // bytes
  nextStatic: number // bytes
  public: number // bytes
  total: number // bytes
}

export interface AppStorageHistory {
  appName: string
  points: StoragePoint[]
  lastUpdated: number
}

/**
 * Получить путь к файлу истории хранилища для приложения
 */
function getStorageFilePath(appName: string): string {
  return path.join(STORAGE_DIR, `${appName}.json`)
}

/**
 * Создать директорию хранилища если не существует
 */
async function ensureStorageDir(): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true })
}

/**
 * Загрузить историю хранилища для приложения
 */
export async function loadStorageHistory(appName: string): Promise<AppStorageHistory> {
  try {
    const filePath = getStorageFilePath(appName)
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content) as AppStorageHistory
  } catch {
    return {
      appName,
      points: [],
      lastUpdated: 0,
    }
  }
}

/**
 * Сохранить историю хранилища для приложения
 */
async function saveStorageHistory(history: AppStorageHistory): Promise<void> {
  await ensureStorageDir()
  const filePath = getStorageFilePath(history.appName)
  await writeFile(filePath, JSON.stringify(history, null, 2))
}

/**
 * Добавить точку хранилища в историю приложения
 * Возвращает true если точка добавлена, false если пропущена (слишком рано)
 */
export async function addStoragePoint(
  appName: string,
  uploads: number,
  nextStatic: number,
  publicSize: number
): Promise<boolean> {
  const history = await loadStorageHistory(appName)
  const now = Date.now()

  // Пропускаем если последнее обновление было слишком недавно
  if (now - history.lastUpdated < COLLECTION_INTERVAL_MS - 60000) {
    return false
  }

  // Добавляем новую точку
  history.points.push({
    timestamp: now,
    uploads,
    nextStatic,
    public: publicSize,
    total: uploads + nextStatic + publicSize,
  })

  // Обрезаем до максимального количества точек
  if (history.points.length > MAX_HISTORY_POINTS) {
    history.points = history.points.slice(-MAX_HISTORY_POINTS)
  }

  history.lastUpdated = now
  await saveStorageHistory(history)
  return true
}

/**
 * Получить историю хранилища для приложения с опциональной фильтрацией по времени
 */
export async function getStorageHistory(appName: string, days = 30): Promise<StoragePoint[]> {
  const history = await loadStorageHistory(appName)
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return history.points.filter((p) => p.timestamp >= cutoff)
}

/**
 * Форматировать точки хранилища для отображения на графике
 */
export function formatStorageForChart(points: StoragePoint[]): {
  total: Array<{ time: string; value: number; timestamp: number }>
  uploads: Array<{ time: string; value: number; timestamp: number }>
  nextStatic: Array<{ time: string; value: number; timestamp: number }>
} {
  return {
    total: points.map((p) => ({
      time: formatDate(new Date(p.timestamp)),
      value: p.total,
      timestamp: p.timestamp,
    })),
    uploads: points.map((p) => ({
      time: formatDate(new Date(p.timestamp)),
      value: p.uploads,
      timestamp: p.timestamp,
    })),
    nextStatic: points.map((p) => ({
      time: formatDate(new Date(p.timestamp)),
      value: p.nextStatic,
      timestamp: p.timestamp,
    })),
  }
}

/**
 * Рассчитать статистику роста хранилища
 */
export function calculateGrowthStats(points: StoragePoint[]): {
  currentSize: number
  oldestSize: number
  growthBytes: number
  growthPercent: number
  avgDailyGrowth: number
} | null {
  if (points.length < 2) {
    return null
  }

  const oldest = points[0]
  const current = points[points.length - 1]
  const daysSpan = (current.timestamp - oldest.timestamp) / (24 * 60 * 60 * 1000)

  const growthBytes = current.total - oldest.total
  const growthPercent = oldest.total > 0 ? (growthBytes / oldest.total) * 100 : 0
  const avgDailyGrowth = daysSpan > 0 ? growthBytes / daysSpan : 0

  return {
    currentSize: current.total,
    oldestSize: oldest.total,
    growthBytes,
    growthPercent,
    avgDailyGrowth,
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    month: 'short',
    day: 'numeric',
  })
}
