import CronParser from 'cron-parser'
import { PgBoss } from 'pg-boss'
import { mergeJobsWithOverrides } from './merge-overrides'
import type { EffectiveJob, JobContext, JobDefinition, JobOverrideRecord, JobRunState, JobStatus } from './types'
import { withTimeout } from './with-timeout'

const DEFAULT_JOB_TIMEOUT_MS = 60_000
/** См. `feedback_moscow_time` в памяти — расписания читает человек, время всегда московское. */
const DEFAULT_TIMEZONE = 'Europe/Moscow'
const DEFAULT_PG_BOSS_SCHEMA = 'pgboss'

export interface JobSchedulerOptions {
  /** Строка подключения к БД приложения — та же, что `DATABASE_URL`. */
  connectionString: string
  /** Реестр задач приложения — обычно `Object.values(jobs)` из `src/jobs/index.ts`. */
  jobs: JobDefinition[]
  /** Оверрайды из БД (модель `JobOverride`), читаются один раз перед `start()`. */
  overrides: JobOverrideRecord[]
  /**
   * Имя схемы pg-boss в БД приложения. По умолчанию `pgboss` — pg-boss создаёт и мигрирует её
   * сам при первом `start()`, живёт рядом с основной схемой ZenStack, ей не подчиняется.
   */
  schema?: string
  /**
   * По умолчанию `true` — `start()` регистрирует cron-расписание, задачи тикают сами.
   * `false`: очереди и обработчики всё равно регистрируются (доступны `runNow`/`getStatuses`),
   * но `schedule()`/`unschedule()` не вызываются — ничего не запускается автоматически.
   * Для явного opt-in автозапуска в конкретном окружении (dev по умолчанию не должен слать
   * реальные письма каждые 5 минут) и для безопасного миграционного окна, когда старый и новый
   * планировщик не должны тикать одновременно.
   */
  autoSchedule?: boolean
}

export interface JobScheduler {
  /** Поднимает pg-boss, создаёт очереди, применяет расписания, регистрирует обработчики. Идемпотентно на уровне pg-boss (createQueue/schedule — upsert). */
  start(): Promise<void>
  stop(): Promise<void>
  /** Ставит задачу в очередь немедленно — для кнопки «Запустить сейчас» в админке. Возвращает id запуска pg-boss. */
  runNow(jobId: string): Promise<string | null>
  /** Снимок состояния всех задач реестра — для админки и `/api/jobs/status`. */
  getStatuses(): Promise<JobStatus[]>
  /**
   * Применяет новый оверрайд задачи немедленно, без рестарта процесса — правка через админку
   * (`JobOverride` в БД) должна подействовать сразу, а не только на следующем деплое. Вызывать
   * ПОСЛЕ того, как оверрайд уже записан в БД (эта функция саму запись не делает).
   */
  setOverride(jobId: string, override: { schedule: string | null; enabled: boolean | null }): Promise<void>
}

interface LastRunRow {
  state: JobRunState
  createdOn: Date
  completedOn: Date | null
  output: unknown
}

export function createJobScheduler(options: JobSchedulerOptions): JobScheduler {
  const schema = options.schema ?? DEFAULT_PG_BOSS_SCHEMA
  const effectiveJobs = mergeJobsWithOverrides(options.jobs, options.overrides)
  const byId = new Map(effectiveJobs.map((job) => [job.definition.id, job]))
  const boss = new PgBoss({ connectionString: options.connectionString, schema })
  const autoSchedule = options.autoSchedule ?? true
  let started = false

  async function applyJob(job: EffectiveJob): Promise<void> {
    await boss.createQueue(job.definition.id, {
      retryLimit: job.definition.retryLimit ?? 0,
      retryDelay: job.definition.retryDelaySeconds ?? 0,
    })

    if (autoSchedule) {
      if (job.enabled) {
        await boss.schedule(job.definition.id, job.schedule, undefined, {
          tz: job.definition.timezone ?? DEFAULT_TIMEZONE,
        })
      } else {
        await boss.unschedule(job.definition.id)
      }
    }

    const timeoutMs = job.definition.timeoutMs ?? DEFAULT_JOB_TIMEOUT_MS
    await boss.work(job.definition.id, async ([task]) => {
      const ctx: JobContext = { runId: task.id, scheduledAt: new Date() }
      await withTimeout(job.definition.handler(ctx), timeoutMs, job.definition.id)
    })
  }

  async function start(): Promise<void> {
    boss.on('error', (error) => {
      console.error(`[jobs] pg-boss (schema "${schema}"):`, error)
    })

    await boss.start()

    for (const job of effectiveJobs) {
      await applyJob(job)
    }

    started = true
  }

  async function stop(): Promise<void> {
    if (!started) {
      return
    }
    await boss.stop({ graceful: true })
    started = false
  }

  async function runNow(jobId: string): Promise<string | null> {
    const job = byId.get(jobId)
    if (!job) {
      throw new Error(`runNow: неизвестная задача "${jobId}" (нет в реестре @letar/jobs этого приложения)`)
    }
    return boss.send(jobId, {})
  }

  function computeNextRunAt(job: EffectiveJob): Date | null {
    // Без автотика расписание в pg-boss не зарегистрировано вовсе — обещать следующий запуск
    // нельзя, иначе админка показывает время, в которое заведомо ничего не произойдёт
    // (так невыставленный JOBS_ENABLED на проде studio выглядел как исправно работающий крон).
    if (!autoSchedule || !job.enabled) {
      return null
    }
    try {
      const interval = CronParser.parse(job.schedule, {
        tz: job.definition.timezone ?? DEFAULT_TIMEZONE,
      })
      return interval.next().toDate()
    } catch {
      return null
    }
  }

  function extractError(output: unknown): string | null {
    if (output && typeof output === 'object' && 'message' in output) {
      return String((output as { message: unknown }).message)
    }
    return output ? JSON.stringify(output) : null
  }

  async function fetchLastRun(jobId: string): Promise<LastRunRow | undefined> {
    const db = boss.getDb()
    const { rows } = await db.executeSql(
      `select state, created_on as "createdOn", completed_on as "completedOn", output
       from ${schema}.job where name = $1 order by created_on desc limit 1`,
      [jobId],
    )
    return rows[0] as LastRunRow | undefined
  }

  async function getStatuses(): Promise<JobStatus[]> {
    const statuses: JobStatus[] = []

    for (const job of effectiveJobs) {
      const last = await fetchLastRun(job.definition.id)

      statuses.push({
        id: job.definition.id,
        name: job.definition.name,
        description: job.definition.description,
        schedule: job.schedule,
        hasOverride: job.hasOverride,
        enabled: job.enabled,
        lastRunAt: last?.createdOn ?? null,
        lastRunState: last?.state ?? null,
        lastRunError: last?.state === 'failed' ? extractError(last.output) : null,
        lastRunDurationMs: last?.completedOn
          ? last.completedOn.getTime() - last.createdOn.getTime()
          : null,
        nextRunAt: computeNextRunAt(job),
        autoSchedule,
      })
    }

    return statuses
  }

  async function setOverride(
    jobId: string,
    override: { schedule: string | null; enabled: boolean | null },
  ): Promise<void> {
    const job = byId.get(jobId)
    if (!job) {
      throw new Error(`setOverride: неизвестная задача "${jobId}" (нет в реестре @letar/jobs этого приложения)`)
    }

    const [merged] = mergeJobsWithOverrides([job.definition], [{ jobId, ...override }])
    job.schedule = merged.schedule
    job.enabled = merged.enabled
    job.hasOverride = merged.hasOverride

    if (started) {
      await applyJob(job)
    }
  }

  return { start, stop, runNow, getStatuses, setOverride }
}
