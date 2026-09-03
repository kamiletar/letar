import { createJobScheduler } from './scheduler'
import type { JobScheduler } from './scheduler'
import type { JobDefinition, JobOverrideRecord, JobStatus } from './types'

/** Минимальный контракт enhanced/raw Prisma-клиента приложения, нужный этой фабрике. */
export interface AppJobsPrismaClient {
  jobOverride: {
    findMany(): Promise<{ jobId: string; schedule: string | null; enabled: boolean | null }[]>
  }
}

export interface AppJobsModuleOptions {
  /**
   * Уникальный ключ приложения для кэша через `globalThis` — тот же паттерн, что `orm` в
   * `lib/db.ts` каждого приложения: без него hot reload в dev плодил бы новый `PgBoss` (и новое
   * соединение) на каждый запрос. Обычно — имя приложения (`"studio"`, `"dashboard"`).
   */
  cacheKey: string
  /** Реестр задач приложения — обычно `Object.values(jobs)` из `src/jobs/index.ts`. */
  jobs: JobDefinition[]
  /** Клиент приложения с моделью `JobOverride` (см. `schema.zmodel`) — обычно `prisma` из `@/lib/db`. */
  prisma: AppJobsPrismaClient
}

export interface AppJobsModule {
  /**
   * Поднимает планировщик один раз на процесс — вызывать из `instrumentation.ts` (`register()`,
   * `NEXT_RUNTIME === 'nodejs'`). pg-boss безопасен к нескольким процессам сразу (rollout при
   * деплое): миграция своей схемы и cron-тик защищены распределённой блокировкой на стороне БД.
   *
   * ⚠️ Реальный автотик по расписанию — только при `JOBS_ENABLED=true` (`autoSchedule` в
   * `createJobScheduler`). Без флага (дефолт) очереди и обработчики всё равно регистрируются —
   * ручные операции (`runNow`, `getStatuses`) работают, — но cron-расписание не ставится, ничего
   * не срабатывает само. Два независимых назначения флага:
   * 1) локальная разработка (`next dev`) не должна незапланированно слать письма/push каждые
   *    несколько минут по локальной БД;
   * 2) миграционное окно — задеплоить код с планировщиком, убедиться, что pg-boss поднял свою
   *    схему без ошибок, и только потом включить флагом (см. PLAN-INFRA-4.md §75).
   */
  start(): Promise<JobScheduler>
  /** Для админки и `/api/jobs/status` — не поднимает планировщик повторно, если уже стартован. */
  getStatuses(): Promise<JobStatus[]>
  /** Кнопка «Запустить сейчас» в админке — ставит задачу в очередь немедленно. */
  runNow(jobId: string): Promise<string | null>
  /**
   * Применяет оверрайд задачи в уже работающем планировщике сразу после того, как он записан
   * в БД — без этого правка через админку подействовала бы только на следующем деплое.
   */
  applyOverride(jobId: string, override: { schedule: string | null; enabled: boolean | null }): Promise<void>
}

/**
 * Фабрика планировщика задач приложения поверх `createJobScheduler` — инкапсулирует
 * globalThis-кеш инстанса и загрузку оверрайдов из БД, общие для всех приложений на
 * `@letar/jobs`. См. `AppJobsModule.start` за подробностями про `JOBS_ENABLED`.
 */
export function createAppJobsModule(options: AppJobsModuleOptions): AppJobsModule {
  const globalKey = `__letarAppJobScheduler_${options.cacheKey}`
  const g = globalThis as unknown as Record<string, JobScheduler | undefined>

  async function loadOverrides(): Promise<JobOverrideRecord[]> {
    const rows = await options.prisma.jobOverride.findMany()
    return rows.map((row) => ({ jobId: row.jobId, schedule: row.schedule, enabled: row.enabled }))
  }

  async function start(): Promise<JobScheduler> {
    const cached = g[globalKey]
    if (cached) {
      return cached
    }

    const overrides = await loadOverrides()
    const autoSchedule = process.env.JOBS_ENABLED === 'true'
    const scheduler = createJobScheduler({
      connectionString: process.env.DATABASE_URL!,
      jobs: options.jobs,
      overrides,
      autoSchedule,
    })

    await scheduler.start()
    if (!autoSchedule) {
      console.warn('[jobs] JOBS_ENABLED не установлен в "true" — расписание не тикает, доступен только ручной запуск')
    }

    g[globalKey] = scheduler
    return scheduler
  }

  async function getStatuses(): Promise<JobStatus[]> {
    const scheduler = g[globalKey] ?? (await start())
    return scheduler.getStatuses()
  }

  async function runNow(jobId: string): Promise<string | null> {
    const scheduler = g[globalKey] ?? (await start())
    return scheduler.runNow(jobId)
  }

  async function applyOverride(
    jobId: string,
    override: { schedule: string | null; enabled: boolean | null },
  ): Promise<void> {
    const scheduler = g[globalKey] ?? (await start())
    await scheduler.setOverride(jobId, override)
  }

  return { start, getStatuses, runNow, applyOverride }
}
