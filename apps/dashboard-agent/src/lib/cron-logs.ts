/**
 * In-memory хранилище логов выполнения cron-задач (последние N записей на задачу).
 * Персистится в Redis (best-effort, см. `cron-logs-redis.ts`) — переживает рестарт
 * контейнера, тот же паттерн, что deployHistory в routes/deploy.ts. Закрывает
 * Backlog «Логи cron-задач в памяти, CronExecutionLog в БД dashboard — мёртвая модель»:
 * dashboard-agent пишет в свою Redis-персистентность вместо БД dashboard (та модель никем
 * не читалась и не писалась — по-прежнему остаётся мёртвой, решение по ней отдельное).
 */

import { persistJobLogs, restorePersistedLogsInto } from './cron-logs-redis'
import type { CronExecutionLog } from './cron-types'

const MAX_LOGS_PER_JOB = 50
const executionLogs = new Map<string, CronExecutionLog[]>()

/**
 * Восстанавливает executionLogs из Redis при старте процесса. Записи, застигнутые в
 * статусе running (агент перезапустился посреди выполнения задачи), помечаются error —
 * реальный исход неизвестен dashboard-agent'у после рестарта.
 */
export async function rehydrateExecutionLogsFromRedis(): Promise<void> {
  await restorePersistedLogsInto(executionLogs)
}

/**
 * Генерация ID для лога
 */
export function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Добавление лога в хранилище
 */
export function addLog(log: CronExecutionLog): void {
  const logs = executionLogs.get(log.jobId) || []
  logs.unshift(log)

  // Ограничиваем количество логов
  if (logs.length > MAX_LOGS_PER_JOB) {
    logs.pop()
  }

  executionLogs.set(log.jobId, logs)
  void persistJobLogs(log.jobId, logs)
}

/**
 * Обновление лога
 */
export function updateLog(logId: string, jobId: string, updates: Partial<CronExecutionLog>): void {
  const logs = executionLogs.get(jobId) || []
  const index = logs.findIndex((l) => l.id === logId)
  if (index !== -1) {
    logs[index] = { ...logs[index], ...updates }
  }
  void persistJobLogs(jobId, logs)
}

/**
 * Получение последнего лога задачи
 */
export function getLastJobLog(jobId: string): CronExecutionLog | null {
  const logs = executionLogs.get(jobId) || []
  return logs[0] || null
}

/**
 * Получение логов задачи
 */
export function getJobLogs(jobId: string, limit = 20): CronExecutionLog[] {
  const logs = executionLogs.get(jobId) || []
  return logs.slice(0, limit)
}
