/**
 * Redis-персистентность логов выполнения cron-задач (best-effort).
 * Низкоуровневый слой: сам in-memory-стор живёт в `cron-logs.ts` и передаётся сюда
 * явными аргументами — так модули не образуют цикл импортов.
 */

import type { CronExecutionLog } from './cron-types'
import { getRedis, getRedisWhenReady } from './redis'

const CRON_REDIS_KEY_PREFIX = 'dashboard-agent:cron:'
const CRON_REDIS_JOBS_SET_KEY = `${CRON_REDIS_KEY_PREFIX}jobs`
const CRON_REDIS_ITEM_TTL_SEC = 30 * 24 * 60 * 60

function cronRedisLogsKey(jobId: string): string {
  return `${CRON_REDIS_KEY_PREFIX}logs:${jobId}`
}

/** Немедленный best-effort персист всех логов одной задачи целиком (список короткий — MAX_LOGS_PER_JOB) */
export async function persistJobLogs(jobId: string, logs: CronExecutionLog[]): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }
  try {
    await r.set(cronRedisLogsKey(jobId), JSON.stringify(logs), 'EX', CRON_REDIS_ITEM_TTL_SEC)
    await r.sadd(CRON_REDIS_JOBS_SET_KEY, jobId)
  } catch {
    // Не критично — следующий вызов executeJob попробует снова
  }
}

/**
 * Наполняет переданный стор логами из Redis. Записи, застигнутые в статусе running
 * (агент перезапустился посреди выполнения задачи), помечаются error — реальный исход
 * неизвестен dashboard-agent'у после рестарта.
 */
export async function restorePersistedLogsInto(store: Map<string, CronExecutionLog[]>): Promise<void> {
  // Не getRedis(): на старте процесса клиент ещё не в ready, и команда была бы немедленно
  // отклонена (`Stream isn't writeable`) без повторной попытки — см. getRedisWhenReady
  const r = await getRedisWhenReady('восстановление логов выполнения cron')
  if (!r) {
    return
  }
  try {
    const jobIds = await r.smembers(CRON_REDIS_JOBS_SET_KEY)
    if (jobIds.length === 0) {
      return
    }
    const raws = await r.mget(...jobIds.map(cronRedisLogsKey))
    let restored = 0
    jobIds.forEach((jobId, i) => {
      const raw = raws[i]
      if (!raw) {
        return
      }
      try {
        const logs = JSON.parse(raw) as CronExecutionLog[]
        for (const log of logs) {
          if (log.status === 'running') {
            log.status = 'error'
            log.error = log.error ?? 'Dashboard-agent перезапустился во время выполнения — итог неизвестен'
          }
        }
        store.set(jobId, logs)
        restored += logs.length
      } catch {
        // Битая запись в Redis — пропускаем
      }
    })
    if (restored > 0) {
      console.warn(`[Cron] Восстановлено ${restored} записей логов выполнения из Redis (${jobIds.length} задач)`)
    }
  } catch (error) {
    console.error('[Cron] Не удалось восстановить логи выполнения из Redis:', error)
  }
}
