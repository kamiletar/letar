/**
 * Ring-buffer истории деплоев + long-poll события прогресса.
 * Персистентность в Redis — lib/deploy-history-redis.ts.
 */

import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import { flushPersist, persistDeploy, persistIndex, rehydrateFromRedis, schedulePersist } from './deploy-history-redis'
import { applyPhaseLine, type DeployPhase } from './deploy-phases'
import { captureRouteTableLine, type RouteTableCapture } from './deploy-route-table'

// Ограничения хранения: сколько деплоев помним и сколько строк лога на деплой
export const MAX_DEPLOY_HISTORY = 20
export const MAX_OUTPUT_LINES = 2000

// Статус одного деплоя
export interface DeployStatus {
  deployId: string
  running: boolean
  appName?: string
  staging?: boolean
  containerId?: string
  action?: 'pull' | 'restart' | 'pull-restart' | 'deploy-app' | 'deploy-infra'
  startTime?: string
  endTime?: string
  exitCode?: number | null
  /** Полный лог (капится MAX_OUTPUT_LINES, при переполнении старые строки вытесняются) */
  output: string[]
  /** Сколько строк было вытеснено из начала output из-за переполнения */
  truncatedLines: number
  error?: string
  /** true если запись восстановлена из Redis после рестарта агента во время running=true — реальный
   * исход деплоя после этого момента неизвестен dashboard-agent'у (см. lib/redis.ts) */
  interrupted?: boolean
  /** Структурированный прогресс — распарсен из `::phase:name:start/ok/fail` маркеров
   * deploy-affected.sh и из уже существующих `[step-id]` строк libs/deploy-engine (rollout.ts)
   * при zero-downtime rollout. Не заменяет прозу в `output`, а дополняет её (PLAN-INFRA.md §38). */
  phases: DeployPhase[]
  /** Таблицы маршрутов Next.js, вынутые из потока лога по мере поступления (PLAN-INFRA-6.md §157).
   * Живут отдельно от `output`: таблица печатается в начале фазы `build`, а при s1-сборке (~2000+
   * строк лога) первой вытесняется из капнутого `output`. Занимают килобайты, поэтому общий
   * MAX_OUTPUT_LINES не поднят — см. lib/deploy-route-table.ts. */
  routeTables: RouteTableCapture[]
  /** ISO-время последней строки лога — основа watchdog'а залипания (computeStalled) */
  lastOutputAt?: string
}

// Ring-buffer истории деплоев: новые в конец, старые вытесняются. Персистится в Redis
// (best-effort, см. persistDeploy/persistIndex) — переживает рестарт контейнера.
export const deployHistory: DeployStatus[] = []

/** Восстанавливает deployHistory из Redis при старте процесса — обёртка над
 * deploy-history-redis.ts, чтобы вызывающему (routes/deploy.ts) не нужно было знать
 * про внутреннее устройство ring-buffer'а. */
export async function rehydrateHistory(): Promise<void> {
  await rehydrateFromRedis(deployHistory)
}

/** Создаёт новую запись деплоя и кладёт в историю */
export function createDeploy(
  partial: Omit<DeployStatus, 'deployId' | 'output' | 'truncatedLines' | 'phases' | 'routeTables'>,
): DeployStatus {
  const deploy: DeployStatus = {
    deployId: randomUUID(),
    output: [],
    truncatedLines: 0,
    phases: [],
    routeTables: [],
    lastOutputAt: new Date().toISOString(),
    ...partial,
  }
  deployHistory.push(deploy)
  if (deployHistory.length > MAX_DEPLOY_HISTORY) {
    deployHistory.shift()
  }
  void persistDeploy(deploy)
  void persistIndex(deployHistory)
  return deploy
}

/** Текущий активный или последний завершённый деплой */
export function getLatestDeploy(): DeployStatus | undefined {
  return deployHistory[deployHistory.length - 1]
}

/** Есть ли сейчас работающий деплой */
export function isDeployRunning(): boolean {
  return deployHistory.some((d) => d.running)
}

// =============================================================================
// Long-poll ожидание прогресса (§38 Этап 2) — деплой один на процесс (isDeployRunning
// отклоняет параллельные), поэтому один EventEmitter на все deployId с лихвой хватает.
// =============================================================================

export const deployEvents = new EventEmitter()
deployEvents.setMaxListeners(50)

export function emitDeployEvent(deployId: string): void {
  deployEvents.emit(deployId)
}

/** Завершает разовую docker-команду (pull/restart/compose-up): останавливает running,
 * проставляет endTime и, если передан error, сообщение из него — затем персистит.
 * Не годится для long-running процесса deploy-app/deploy-infra — см. attachDeployProcessHandlers
 * в lib/deploy-process.ts (там своя забота: appendOutput с текстом, exitCode, releaseHostLock). */
export function finishDeploy(deploy: DeployStatus, error?: unknown): void {
  deploy.running = false
  deploy.endTime = new Date().toISOString()
  if (error !== undefined) {
    deploy.error = error instanceof Error ? error.message : 'Unknown error'
  }
  flushPersist(deploy)
}

/** Добавляет строку в лог деплоя с вытеснением старых строк при переполнении, обновляет
 * фазы/lastOutputAt и будит все ожидающие deploy_wait для этого deployId. */
export function appendOutput(deploy: DeployStatus, line: string): void {
  deploy.output.push(line)
  if (deploy.output.length > MAX_OUTPUT_LINES) {
    deploy.output.shift()
    deploy.truncatedLines++
  }
  deploy.lastOutputAt = new Date().toISOString()
  applyPhaseLine(deploy.phases, line)
  // Сквозной номер только что добавленной строки: вытесненные + индекс последней в output
  captureRouteTableLine(deploy.routeTables, line, deploy.truncatedLines + deploy.output.length - 1)
  schedulePersist(deploy)
  emitDeployEvent(deploy.deployId)
}
