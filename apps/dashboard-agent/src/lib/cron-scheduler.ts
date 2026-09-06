/**
 * Планировщик cron-задач поверх node-cron: старт/остановка, планирование отдельных задач
 * и сводные статусы. Само выполнение задачи — в `cron-execution.ts`.
 */

import CronParser from 'cron-parser'
import * as cron from 'node-cron'
import { loadCronConfig, saveCronConfig } from './cron-config'
import { executeJob } from './cron-execution'
import { getLastJobLog } from './cron-logs'
import type { CronJob, CronJobStatus } from './cron-types'

// Scheduled задачи (node-cron tasks)
const scheduledTasks = new Map<string, cron.ScheduledTask>()

/**
 * Запуск планировщика
 */
export function startScheduler(): void {
  const jobs = loadCronConfig()

  for (const job of jobs) {
    if (job.enabled) {
      scheduleJob(job)
    }
  }

  console.warn(`[Cron] Планировщик запущен, ${jobs.filter((j) => j.enabled).length} задач активно`)
}

/**
 * Остановка планировщика
 */
export function stopScheduler(): void {
  for (const [id, task] of scheduledTasks) {
    task.stop()
    console.warn(`[Cron] Остановлена задача: ${id}`)
  }
  scheduledTasks.clear()
}

/**
 * Планирование задачи
 */
export function scheduleJob(job: CronJob): void {
  // Останавливаем существующую
  const existing = scheduledTasks.get(job.id)
  if (existing) {
    existing.stop()
  }

  const task = cron.schedule(job.schedule, async () => {
    console.warn(`[Cron] Выполняется: ${job.name} (${job.id})`)
    await executeJob(job)
  })

  scheduledTasks.set(job.id, task)
  console.warn(`[Cron] Запланирована: ${job.name} - ${job.schedule}`)
}

/**
 * Отмена планирования
 */
export function unscheduleJob(jobId: string): void {
  const task = scheduledTasks.get(jobId)
  if (task) {
    task.stop()
    scheduledTasks.delete(jobId)
  }
}

/**
 * Проверка статуса планировщика
 */
export function isSchedulerRunning(): boolean {
  return scheduledTasks.size > 0
}

/**
 * Количество запланированных задач
 */
export function getScheduledCount(): number {
  return scheduledTasks.size
}

/**
 * Получение следующей даты запуска
 */
export function getNextRunDate(schedule: string): Date | null {
  try {
    const interval = CronParser.parse(schedule)
    return interval.next().toDate()
  } catch {
    return null
  }
}

/**
 * Получение статуса задачи
 */
export function getJobStatus(jobId: string): CronJobStatus | null {
  const jobs = loadCronConfig()
  const job = jobs.find((j) => j.id === jobId)

  if (!job) {
    return null
  }

  const lastLog = getLastJobLog(jobId)

  return {
    job,
    lastRun: lastLog?.startedAt ?? null,
    lastStatus: lastLog?.status ?? null,
    lastError: lastLog?.error ?? null,
    lastDuration: lastLog?.duration ?? null,
    nextRun: getNextRunDate(job.schedule),
    isScheduled: scheduledTasks.has(jobId),
  }
}

/**
 * Получение статусов всех задач
 */
export function getAllJobStatuses(): CronJobStatus[] {
  const jobs = loadCronConfig()
  const statuses: CronJobStatus[] = []

  for (const job of jobs) {
    const lastLog = getLastJobLog(job.id)

    statuses.push({
      job,
      lastRun: lastLog?.startedAt ?? null,
      lastStatus: lastLog?.status ?? null,
      lastError: lastLog?.error ?? null,
      lastDuration: lastLog?.duration ?? null,
      nextRun: getNextRunDate(job.schedule),
      isScheduled: scheduledTasks.has(job.id),
    })
  }

  return statuses
}

/**
 * Обновление задачи
 */
export function updateJob(jobId: string, updates: Partial<CronJob>): CronJob | null {
  const jobs = loadCronConfig()
  const index = jobs.findIndex((j) => j.id === jobId)

  if (index === -1) {
    return null
  }

  const updatedJob = { ...jobs[index], ...updates }
  jobs[index] = updatedJob

  saveCronConfig(jobs)

  // Перепланируем если нужно
  if (updates.schedule !== undefined || updates.enabled !== undefined) {
    if (updatedJob.enabled) {
      scheduleJob(updatedJob)
    } else {
      unscheduleJob(jobId)
    }
  }

  return updatedJob
}
