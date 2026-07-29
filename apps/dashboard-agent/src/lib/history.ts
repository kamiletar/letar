/**
 * System Metrics History
 * Хранит историю системных метрик в памяти (ring buffer)
 * Сбор каждую минуту, хранение до 30 дней
 */

import { getCPUInfo, getDiskInfo, getMemoryInfo, getNetworkInfo } from './system'

// =============================================================================
// Типы
// =============================================================================

interface MetricPoint {
  timestamp: number
  cpu: number // процент загрузки CPU
  memory: number // процент использования памяти
  disk: number // процент использования основного диска
  networkRx: number // байт/сек, входящий трафик (сумма по интерфейсам si.networkStats())
  networkTx: number // байт/сек, исходящий трафик
}

export interface ChartDataPoint {
  time: string
  value: number
  timestamp: number
}

export interface HistoryStats {
  min: number
  max: number
  avg: number
}

export interface HistoryData {
  tier: string
  hours: number
  pointsCount: number
  stats: {
    cpu: HistoryStats
    memory: HistoryStats
    disk: HistoryStats
    networkRx: HistoryStats
    networkTx: HistoryStats
  } | null
  data: {
    cpu: ChartDataPoint[]
    memory: ChartDataPoint[]
    disk: ChartDataPoint[]
    networkRx: ChartDataPoint[]
    networkTx: ChartDataPoint[]
  }
  timeRange: {
    from: string | null
    to: string | null
  }
}

// =============================================================================
// Ring buffer
// =============================================================================

// Максимум 43200 точек = 30 дней при 1мин интервале
const MAX_POINTS = 43200
const COLLECTION_INTERVAL_MS = 60 * 1000 // 1 минута

const history: MetricPoint[] = []
let collectionTimer: ReturnType<typeof setInterval> | null = null

// =============================================================================
// Сбор метрик
// =============================================================================

/**
 * Собирает текущие метрики и добавляет в буфер
 */
async function collectMetrics(): Promise<void> {
  try {
    const [cpu, memory, disks, network] = await Promise.all([
      getCPUInfo(),
      getMemoryInfo(),
      getDiskInfo(),
      getNetworkInfo(),
    ])

    // Находим основной диск (/)
    const rootDisk = disks.find((d) => d.mount === '/') ?? disks[0]
    const diskPercent = rootDisk ? (rootDisk.usedPercent ?? 0) : 0

    // si.networkStats() без аргументов уже возвращает только интерфейс(ы) по умолчанию
    // (см. system.ts:getNetworkInfo) — суммирование безопасно, двойного счёта нет.
    const networkRx = network.stats.reduce((sum, s) => sum + s.rxSec, 0)
    const networkTx = network.stats.reduce((sum, s) => sum + s.txSec, 0)

    const point: MetricPoint = {
      timestamp: Date.now(),
      cpu: cpu.currentLoad,
      memory: memory.usedPercent ?? (memory.used / memory.total) * 100,
      disk: diskPercent,
      networkRx,
      networkTx,
    }

    history.push(point)

    // Ограничиваем буфер
    if (history.length > MAX_POINTS) {
      history.splice(0, history.length - MAX_POINTS)
    }
  } catch {
    // Игнорируем ошибки сбора — не критично
  }
}

// =============================================================================
// Управление
// =============================================================================

/**
 * Запускает фоновый сбор метрик
 */
export function startHistoryCollection(): void {
  if (collectionTimer) {
    return
  }

  // Первая точка сразу при старте
  void collectMetrics()

  collectionTimer = setInterval(collectMetrics, COLLECTION_INTERVAL_MS)
  console.warn('[History] Запущен сбор метрик (интервал: 1 мин)')
}

/**
 * Останавливает сбор метрик
 */
export function stopHistoryCollection(): void {
  if (collectionTimer) {
    clearInterval(collectionTimer)
    collectionTimer = null
  }
}

// =============================================================================
// Получение данных
// =============================================================================

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function calcStats(values: number[]): HistoryStats {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0 }
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return { min, max, avg }
}

/**
 * Делит точки на maxBuckets равных по времени бакетов и усредняет cpu/memory/disk
 * внутри каждого. Timestamp бакета — timestamp последней точки в нём (для консистентности
 * со временем на графике — «конец интервала», а не середина).
 */
function aggregateIntoBuckets(points: MetricPoint[], maxBuckets: number): MetricPoint[] {
  const step = points.length / maxBuckets
  const buckets: MetricPoint[] = []

  for (let i = 0; i < maxBuckets; i++) {
    const start = Math.floor(i * step)
    const end = i === maxBuckets - 1 ? points.length : Math.floor((i + 1) * step)
    const bucket = points.slice(start, end)
    if (bucket.length === 0) {
      continue
    }

    const last = bucket[bucket.length - 1]
    buckets.push({
      timestamp: last.timestamp,
      cpu: bucket.reduce((sum, p) => sum + p.cpu, 0) / bucket.length,
      memory: bucket.reduce((sum, p) => sum + p.memory, 0) / bucket.length,
      disk: bucket.reduce((sum, p) => sum + p.disk, 0) / bucket.length,
      networkRx: bucket.reduce((sum, p) => sum + p.networkRx, 0) / bucket.length,
      networkTx: bucket.reduce((sum, p) => sum + p.networkTx, 0) / bucket.length,
    })
  }

  return buckets
}

/**
 * Возвращает историю метрик за указанный период
 * @param hours — период в часах (1, 6, 24, 168, 720)
 */
export function getHistory(hours: number): HistoryData {
  const cutoff = Date.now() - hours * 60 * 60 * 1000
  const filtered = history.filter((p) => p.timestamp >= cutoff)

  // Агрегация по бакетам: максимум 500 точек в ответе для экономии трафика.
  // Усреднение внутри бакета вместо взятия каждой N-й точки — иначе пики между
  // выбранными точками (например кратковременный скачок CPU) пропадают из ответа.
  const MAX_RESPONSE_POINTS = 500
  const points = filtered.length > MAX_RESPONSE_POINTS ? aggregateIntoBuckets(filtered, MAX_RESPONSE_POINTS) : filtered

  const cpuValues = points.map((p) => p.cpu)
  const memValues = points.map((p) => p.memory)
  const diskValues = points.map((p) => p.disk)
  const networkRxValues = points.map((p) => p.networkRx)
  const networkTxValues = points.map((p) => p.networkTx)

  const tier = hours <= 1 ? '1h' : hours <= 6 ? '6h' : hours <= 24 ? '24h' : hours <= 168 ? '7d' : '30d'

  return {
    tier,
    hours,
    pointsCount: points.length,
    stats:
      points.length > 0
        ? {
            cpu: calcStats(cpuValues),
            memory: calcStats(memValues),
            disk: calcStats(diskValues),
            networkRx: calcStats(networkRxValues),
            networkTx: calcStats(networkTxValues),
          }
        : null,
    data: {
      cpu: points.map((p) => ({ time: formatTime(p.timestamp), value: p.cpu, timestamp: p.timestamp })),
      memory: points.map((p) => ({ time: formatTime(p.timestamp), value: p.memory, timestamp: p.timestamp })),
      disk: points.map((p) => ({ time: formatTime(p.timestamp), value: p.disk, timestamp: p.timestamp })),
      networkRx: points.map((p) => ({ time: formatTime(p.timestamp), value: p.networkRx, timestamp: p.timestamp })),
      networkTx: points.map((p) => ({ time: formatTime(p.timestamp), value: p.networkTx, timestamp: p.timestamp })),
    },
    timeRange: {
      from: points.length > 0 ? new Date(points[0].timestamp).toISOString() : null,
      to: points.length > 0 ? new Date(points[points.length - 1].timestamp).toISOString() : null,
    },
  }
}
