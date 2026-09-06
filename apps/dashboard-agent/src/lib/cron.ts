/**
 * Cron Module for Dashboard Agent
 * Планировщик cron задач с in-memory хранением логов.
 *
 * Точка входа-барель: сам код разнесён по модулям, здесь только реэкспорты, чтобы
 * потребители (`src/index.ts`, `src/routes/cron.ts`) импортировали одно место.
 *
 * - `cron-types.ts`        — типы задачи, лога и статуса
 * - `cron-default-jobs.ts` — каталог дефолтных и выведенных из эксплуатации задач
 * - `cron-config.ts`       — чтение/запись `cron-jobs.json`, мерж дефолтов, фильтр по серверу
 * - `cron-logs.ts`         — in-memory хранилище логов выполнения
 * - `cron-logs-redis.ts`   — best-effort персистентность логов в Redis
 * - `cron-execution.ts`    — HTTP-вызов эндпоинта задачи и алерты о провале
 * - `cron-scheduler.ts`    — node-cron: планирование, статусы, обновление задачи
 */

export { applyRetirement, filterJobsForCurrentServer, loadCronConfig, saveCronConfig } from './cron-config'
export { executeJob } from './cron-execution'
export { getJobLogs, getLastJobLog, rehydrateExecutionLogsFromRedis } from './cron-logs'
export {
  getAllJobStatuses,
  getJobStatus,
  getNextRunDate,
  getScheduledCount,
  isSchedulerRunning,
  scheduleJob,
  startScheduler,
  stopScheduler,
  unscheduleJob,
  updateJob,
} from './cron-scheduler'
export type { CronExecutionLog, CronJob, CronJobStatus, CronServer } from './cron-types'
