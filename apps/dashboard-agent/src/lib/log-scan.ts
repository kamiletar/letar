/**
 * Проактивное сканирование логов контейнеров на ошибки (Backlog «Улучшения сбора метрик»).
 *
 * Pull-доступ к логам уже был (`GET /api/docker/containers/:id/logs` → `docker.ts`), не
 * хватало автоматического обнаружения новых ошибок и алерта — этот модуль закрывает разрыв,
 * по аналогии с `health-check.ts`.
 *
 * Не переиспользует debounce-паттерн `json-state-file.ts` (boolean-флаг / переход состояния)
 * из `health-check.ts` — ошибки в логах событийные (edge), а не level-triggered: нужен курсор
 * "последняя обработанная строка" на контейнер, а не флаг "уже алертили". Курсор — ISO
 * timestamp последней строки лога, которую уже видели (Docker отдаёт timestamps через
 * `timestamps: true` в `getContainerLogs`).
 *
 * Переиспользует `AlertType.CRON_FAILED` вместо нового enum-значения — тот же принцип, что
 * `email-canary.ts` (см. PLAN.md, «избежали Prisma-миграции на боевой БД ради этой задачи»).
 */

import { postDashboardAlert } from './dashboard-alert'
import { getContainerLogs, getContainers } from './docker'
import { loadJsonState, saveJsonState } from './json-state-file'

const STATE_PATH = process.env.LOG_SCAN_STATE_PATH || '/home/deploy/letar/log-scan-state.json'

const LOG_TAIL_LINES = Number(process.env.LOG_SCAN_TAIL_LINES) || 200
const MAX_SAMPLE_LINES = 5

const DEFAULT_ERROR_PATTERN = /\b(error|exception|fatal|panic|unhandled|ECONNREFUSED|EACCES|ENOTFOUND|OOM)\b/i
const ERROR_PATTERN = process.env.LOG_SCAN_ERROR_PATTERN
  ? new RegExp(process.env.LOG_SCAN_ERROR_PATTERN, 'i')
  : DEFAULT_ERROR_PATTERN

interface LogScanState {
  /** ISO timestamp последней обработанной строки лога, по имени контейнера */
  lastSeenAt: Record<string, string>
}

const EMPTY_STATE: LogScanState = { lastSeenAt: {} }

function loadState(): LogScanState {
  const state = loadJsonState<LogScanState>(STATE_PATH, EMPTY_STATE)
  return { lastSeenAt: state.lastSeenAt ?? {} }
}

function saveState(state: LogScanState): void {
  saveJsonState(STATE_PATH, state, 'LogScan')
}

interface ParsedLine {
  timestamp: string
  text: string
}

/** Docker логи со `timestamps: true` — каждая строка начинается с RFC3339-таймстампа + пробел. */
function parseLines(raw: string): ParsedLine[] {
  const lines: ParsedLine[] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) {
      continue
    }
    const spaceIdx = line.indexOf(' ')
    if (spaceIdx === -1) {
      continue
    }
    const timestamp = line.slice(0, spaceIdx)
    if (Number.isNaN(Date.parse(timestamp))) {
      continue
    }
    lines.push({ timestamp, text: line.slice(spaceIdx + 1) })
  }
  return lines
}

export interface LogScanResult {
  checkedAt: string
  containersScanned: number
  alertsTriggered: string[]
}

/**
 * Один прогон сканирования — вызывается роутом `/api/cron/log-scan`. Контейнер, встреченный
 * впервые, не алертит бэклог: курсор инициализируется на "сейчас", чтобы включение фичи не
 * подняло всю накопленную историю логов как единый шквал алертов.
 */
export async function runLogScan(): Promise<LogScanResult> {
  const checkedAt = new Date().toISOString()
  const state = loadState()
  const alertsTriggered: string[] = []

  let containers: Awaited<ReturnType<typeof getContainers>>
  try {
    containers = await getContainers(false)
  } catch (error) {
    console.error('[LogScan] Не удалось получить список контейнеров:', error)
    return { checkedAt, containersScanned: 0, alertsTriggered }
  }

  const seenNames = new Set<string>()

  for (const container of containers) {
    seenNames.add(container.name)

    let raw: string
    try {
      const logs = await getContainerLogs(container.id, LOG_TAIL_LINES)
      raw = logs.stdout
    } catch (error) {
      console.error(`[LogScan] Не удалось получить логи ${container.name}:`, error)
      continue
    }

    const lines = parseLines(raw)
    const lastSeenAt = state.lastSeenAt[container.name]

    if (!lastSeenAt) {
      state.lastSeenAt[container.name] = checkedAt
      continue
    }

    const newLines = lines.filter((line) => line.timestamp > lastSeenAt)
    const errorLines = newLines.filter((line) => ERROR_PATTERN.test(line.text))

    if (errorLines.length > 0) {
      const sample = errorLines.slice(0, MAX_SAMPLE_LINES).map((l) => l.text)
      await postDashboardAlert({
        type: 'CRON_FAILED',
        severity: 'WARNING',
        title: `Ошибки в логах: ${container.name} (${errorLines.length})`,
        message: `Найдено ${errorLines.length} новых строк с ошибками в логах ${container.name}:\n${sample.join('\n')}`,
        metadata: { jobId: 'log-scan', container: container.name, count: errorLines.length, sample },
      })
      alertsTriggered.push(container.name)
    }

    if (newLines.length > 0) {
      state.lastSeenAt[container.name] = newLines[newLines.length - 1].timestamp
    }
  }

  // Контейнеры, пропавшие из списка (удалены/остановлены) — чистим курсор, чтобы не копить мусор.
  for (const name of Object.keys(state.lastSeenAt)) {
    if (!seenNames.has(name)) {
      delete state.lastSeenAt[name]
    }
  }

  saveState(state)

  return { checkedAt, containersScanned: containers.length, alertsTriggered }
}
