import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

const dashboardDataDir = process.env.DASHBOARD_DATA_DIR || path.join(process.cwd(), 'dashboard-data')
const METRICS_DIR = path.join(dashboardDataDir, 'metrics')

// Сохраняем метрики каждые 5 минут, храним 24 часа = 288 точек
const COLLECTION_INTERVAL_MS = 5 * 60 * 1000 // 5 минут
const MAX_HISTORY_POINTS = 288 // 24 часа при интервале 5 минут

export interface MetricPoint {
  timestamp: number
  cpu: number
  memory: number
  memoryUsed?: number
  memoryLimit?: number
}

export interface AppMetricsHistory {
  appName: string
  points: MetricPoint[]
  lastUpdated: number
}

/**
 * Получить путь к файлу метрик для приложения
 */
function getMetricsFilePath(appName: string): string {
  return path.join(METRICS_DIR, `${appName}.json`)
}

/**
 * Создать директорию метрик если не существует
 */
async function ensureMetricsDir(): Promise<void> {
  await mkdir(METRICS_DIR, { recursive: true })
}

/**
 * Загрузить историю метрик для приложения
 */
export async function loadMetricsHistory(appName: string): Promise<AppMetricsHistory> {
  try {
    const filePath = getMetricsFilePath(appName)
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content) as AppMetricsHistory
  } catch {
    // Возвращаем пустую историю если файл не существует
    return {
      appName,
      points: [],
      lastUpdated: 0,
    }
  }
}

/**
 * Сохранить историю метрик для приложения
 */
async function saveMetricsHistory(history: AppMetricsHistory): Promise<void> {
  await ensureMetricsDir()
  const filePath = getMetricsFilePath(history.appName)
  await writeFile(filePath, JSON.stringify(history, null, 2))
}

/**
 * Добавить точку метрик в историю приложения
 * Возвращает true если точка добавлена, false если пропущена (слишком рано)
 */
export async function addMetricPoint(
  appName: string,
  cpu: number,
  memory: number,
  memoryUsed?: number,
  memoryLimit?: number,
): Promise<boolean> {
  const history = await loadMetricsHistory(appName)
  const now = Date.now()

  // Пропускаем если последнее обновление было слишком недавно
  if (now - history.lastUpdated < COLLECTION_INTERVAL_MS - 30000) {
    return false
  }

  // Добавляем новую точку
  history.points.push({
    timestamp: now,
    cpu,
    memory,
    memoryUsed,
    memoryLimit,
  })

  // Обрезаем до максимального количества точек
  if (history.points.length > MAX_HISTORY_POINTS) {
    history.points = history.points.slice(-MAX_HISTORY_POINTS)
  }

  history.lastUpdated = now
  await saveMetricsHistory(history)
  return true
}

/**
 * Получить историю метрик для приложения с опциональной фильтрацией по времени
 */
export async function getMetricsHistory(appName: string, hours = 24): Promise<MetricPoint[]> {
  const history = await loadMetricsHistory(appName)
  const cutoff = Date.now() - hours * 60 * 60 * 1000
  return history.points.filter((p) => p.timestamp >= cutoff)
}

/**
 * Получить все приложения с историей метрик
 */
export async function getAllAppsWithMetrics(): Promise<string[]> {
  try {
    await ensureMetricsDir()
    const { readdir } = await import('fs/promises')
    const files = await readdir(METRICS_DIR)
    return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''))
  } catch {
    return []
  }
}

/**
 * Форматировать точки метрик для отображения на графике
 */
export function formatMetricsForChart(points: MetricPoint[]): {
  cpu: Array<{ time: string; value: number; timestamp: number }>
  memory: Array<{ time: string; value: number; timestamp: number }>
} {
  return {
    cpu: points.map((p) => ({
      time: formatTime(new Date(p.timestamp)),
      value: p.cpu,
      timestamp: p.timestamp,
    })),
    memory: points.map((p) => ({
      time: formatTime(new Date(p.timestamp)),
      value: p.memory,
      timestamp: p.timestamp,
    })),
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
