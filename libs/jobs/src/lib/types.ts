/**
 * Контекст, передаваемый обработчику задачи при каждом запуске.
 */
export interface JobContext {
  /** ID конкретного запуска в pg-boss (`pgboss.job.id`) — использовать для логов/трассировки. */
  runId: string
  /** Момент, когда запуск был поставлен в очередь (не момент старта обработчика). */
  scheduledAt: Date
}

export type JobHandler = (ctx: JobContext) => Promise<void>

/**
 * Декларация одной периодической задачи. Регистрируется в реестре приложения
 * (обычно `src/jobs/index.ts`) и передаётся в `createJobScheduler`.
 */
export interface JobDefinition {
  /** Уникальный в рамках приложения id — совпадает с именем очереди pg-boss. */
  id: string
  /** Человекочитаемое имя для админки. */
  name: string
  /** Описание — что делает задача и почему, для админки и логов. */
  description: string
  /** Cron-выражение по умолчанию (5 полей, `node-cron`/`cron-parser` совместимое). */
  schedule: string
  /** Часовой пояс cron-выражения. По умолчанию — `Europe/Moscow` (см. feedback_moscow_time). */
  timezone?: string
  /** Включена ли задача по умолчанию — переопределяется `JobOverride.enabled` в БД. */
  enabled?: boolean
  /** Таймаут одного запуска, мс. По умолчанию — `DEFAULT_JOB_TIMEOUT_MS`. */
  timeoutMs?: number
  /** Число повторов при неуспехе (pg-boss `retryLimit`). По умолчанию 0 — задачи в основном идемпотентные, но не все. */
  retryLimit?: number
  /** Задержка перед повтором, секунды (pg-boss `retryDelay`). */
  retryDelaySeconds?: number
  handler: JobHandler
}

/**
 * Пользовательский оверрайд одной задачи — хранится в БД приложения (модель `JobOverride`
 * в `schema.zmodel`), накладывается поверх `JobDefinition` при синхронизации расписаний.
 * `null` в поле означает «оверрайда нет, использовать значение из кода».
 */
export interface JobOverrideRecord {
  jobId: string
  schedule: string | null
  enabled: boolean | null
}

/** `JobDefinition` со значениями, уже слитыми с оверрайдом — то, что реально уходит в pg-boss. */
export interface EffectiveJob {
  definition: JobDefinition
  schedule: string
  enabled: boolean
  hasOverride: boolean
}

export type JobRunState = 'created' | 'active' | 'completed' | 'failed' | 'cancelled' | 'retry'

/** Снимок состояния задачи для админки и для `/api/jobs/status`, который опрашивает dashboard-agent. */
export interface JobStatus {
  id: string
  name: string
  description: string
  schedule: string
  hasOverride: boolean
  enabled: boolean
  lastRunAt: Date | null
  lastRunState: JobRunState | null
  lastRunError: string | null
  lastRunDurationMs: number | null
  nextRunAt: Date | null
  /**
   * Тикает ли расписание в этом процессе (`autoSchedule` планировщика). При `false` задачи
   * запускаются только вручную (`runNow`), а `nextRunAt` всегда `null` — админке есть что
   * показать владельцу, иначе выключенный автотик неотличим от работающего.
   */
  autoSchedule: boolean
}
