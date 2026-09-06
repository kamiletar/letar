/**
 * Выполнение cron-задачи: HTTP-вызов эндпоинта приложения с таймаутом, запись логов
 * и уведомление dashboard о провале. Планирование — в `cron-scheduler.ts`.
 */

import { getAppUrl } from './app-registry'
import { getAppCronSecret } from './app-secrets'
import { addLog, generateLogId, updateLog } from './cron-logs'
import type { CronExecutionLog, CronJob } from './cron-types'
import { postDashboardAlert } from './dashboard-alert'

/** Таймаут HTTP-запроса к эндпоинту задачи по умолчанию — переопределяется `CronJob.timeoutMs`. */
const DEFAULT_TIMEOUT_MS = 60_000

/**
 * Уведомляет dashboard о провале cron-задачи (создаёт Alert type=CRON_FAILED,
 * dashboard сам решает — слать ли в Telegram по своим AlertSettings).
 * Ошибки самого уведомления не должны ронять выполнение задачи — за это отвечает
 * postDashboardAlert(), она сама не бросает исключений.
 */
async function notifyDashboardAlert(job: CronJob, errorMessage: string, statusCode: number | null): Promise<void> {
  await postDashboardAlert({
    type: 'CRON_FAILED',
    severity: 'ERROR',
    title: `Cron задача провалилась: ${job.name}`,
    message: errorMessage,
    metadata: { jobId: job.id, app: job.app, endpoint: job.endpoint, statusCode },
  })
}

/**
 * Выполнение задачи
 */
export async function executeJob(job: CronJob): Promise<CronExecutionLog> {
  const startedAt = new Date()
  const logId = generateLogId()

  // Создаём лог со статусом running
  const log: CronExecutionLog = {
    id: logId,
    jobId: job.id,
    startedAt,
    completedAt: null,
    status: 'running',
    statusCode: null,
    responseBody: null,
    error: null,
    duration: null,
  }
  addLog(log)

  try {
    const url = getAppUrl(job.app, job.endpoint)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), job.timeoutMs ?? DEFAULT_TIMEOUT_MS)

    // Секрет берётся у ПРИЛОЖЕНИЯ, к которому идём, а не у агента: `CRON_SECRET` у каждого
    // приложения свой (PLAN-INFRA.md §52). Раньше здесь стоял единый секрет агента с откатом
    // на литерал `'default-cron-secret'` — из-за него все задачи к приложениям с несовпавшим
    // секретом месяцами падали с 401, неотличимым от настоящей проблемы авторизации.
    const cronSecret = getAppCronSecret(job.app)
    if (!cronSecret) {
      // Осознанно не шлём запрос вовсе. Запрос с заведомо неверным секретом вернул бы 401 и
      // спрятал бы настоящую причину — «секрет негде взять» — за кодом ответа приложения.
      throw new Error(
        `CRON_SECRET для приложения «${job.app}» недоступен: нет ключа в /secrets/${job.app}.env `
          + `(проверь volume-маунт в docker-compose.production.yml агента и наличие CRON_SECRET `
          + `в .env.docker приложения). Запрос не отправлен.`,
      )
    }

    // Определяем заголовки авторизации
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Cron-Secret': cronSecret,
    }

    // Для внутренних вызовов dashboard-agent добавляем AGENT_TOKEN
    if (job.app === 'dashboard-agent' && process.env.AGENT_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.AGENT_TOKEN}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const completedAt = new Date()
    const duration = completedAt.getTime() - startedAt.getTime()

    let responseBody: string | null = null
    try {
      responseBody = await response.text()
    } catch {
      // Игнорируем
    }

    const isSuccess = response.ok
    const status = isSuccess ? 'success' : 'error'
    const errorMsg = isSuccess ? null : `HTTP ${response.status}: ${response.statusText}`

    updateLog(logId, job.id, {
      status,
      completedAt,
      statusCode: response.status,
      responseBody,
      error: errorMsg,
      duration,
    })

    if (!isSuccess) {
      void notifyDashboardAlert(job, errorMsg as string, response.status)
    }

    return {
      ...log,
      status,
      completedAt,
      statusCode: response.status,
      responseBody,
      error: errorMsg,
      duration,
    }
  } catch (error) {
    const completedAt = new Date()
    const duration = completedAt.getTime() - startedAt.getTime()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    updateLog(logId, job.id, {
      status: 'error',
      completedAt,
      error: errorMessage,
      duration,
    })

    void notifyDashboardAlert(job, errorMessage, null)

    return {
      ...log,
      status: 'error',
      completedAt,
      error: errorMessage,
      duration,
    }
  }
}
