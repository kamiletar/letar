/**
 * Типы cron-модуля dashboard-agent
 * Вынесены отдельно, чтобы конфигурация, логи, планировщик и выполнение задач могли
 * ссылаться на них, не импортируя друг друга (иначе получаются циклы).
 */

import type { CronServer } from './server-config'

export type { CronServer }

export interface CronJob {
  id: string
  name: string
  app: string
  endpoint: string
  schedule: string
  description: string
  enabled: boolean
  /** Сервер на котором выполнять задачу (опционально) */
  server?: CronServer
  /** Таймаут HTTP-запроса к эндпоинту задачи, мс. По умолчанию — DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number
}

export interface CronExecutionLog {
  id: string
  jobId: string
  startedAt: Date
  completedAt: Date | null
  status: 'success' | 'error' | 'running'
  statusCode: number | null
  responseBody: string | null
  error: string | null
  duration: number | null
}

export interface CronJobStatus {
  job: CronJob
  lastRun: Date | null
  lastStatus: 'success' | 'error' | 'running' | null
  lastError: string | null
  lastDuration: number | null
  nextRun: Date | null
  isScheduled: boolean
}
