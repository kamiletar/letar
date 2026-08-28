/**
 * Ring-buffer истории деплоев + long-poll события прогресса.
 * Персистентность в Redis — lib/deploy-history-redis.ts.
 */

import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import { persistDeploy, persistIndex, rehydrateFromRedis, schedulePersist } from './deploy-history-redis'
import { applyPhaseLine, type DeployPhase } from './deploy-phases'

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
  partial: Omit<DeployStatus, 'deployId' | 'output' | 'truncatedLines' | 'phases'>,
): DeployStatus {
  const deploy: DeployStatus = {
    deployId: randomUUID(),
    output: [],
    truncatedLines: 0,
    phases: [],
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
  schedulePersist(deploy)
  emitDeployEvent(deploy.deployId)
}
