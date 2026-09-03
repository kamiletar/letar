import { prisma } from '@/lib/db'
import { createJobScheduler, type JobOverrideRecord, type JobScheduler, type JobStatus } from '@letar/jobs'
import { jobs } from './index'

/**
 * Кэшируем через globalThis — тот же паттерн, что `orm` в `lib/db.ts`: без него hot reload
 * в dev плодил бы новый `PgBoss` (и новое соединение) на каждый запрос.
 */
const g = globalThis as unknown as { dashboardJobScheduler: JobScheduler | undefined }

async function loadOverrides(): Promise<JobOverrideRecord[]> {
  const rows = await prisma.jobOverride.findMany()
  return rows.map((row) => ({ jobId: row.jobId, schedule: row.schedule, enabled: row.enabled }))
}

/**
 * Поднимает планировщик один раз на процесс — вызывать из `instrumentation.ts` (`register()`,
 * `NEXT_RUNTIME === 'nodejs'`). pg-boss безопасен к нескольким процессам сразу (rollout при
 * деплое): миграция своей схемы и cron-тик защищены распределённой блокировкой на стороне БД.
 *
 * ⚠️ Реальный автотик по расписанию — только при `JOBS_ENABLED=true` (`autoSchedule` в
 * `@letar/jobs`). Без флага (дефолт) очереди и обработчики всё равно регистрируются — ручные
 * операции (`runDashboardJobNow`, `getStatuses`) работают, — но cron-расписание не ставится.
 * Тот же паттерн, что у пилота `studio` (PLAN-INFRA-4.md §75): локальная разработка не должна
 * незапланированно слать Telegram/парсить логи каждые несколько минут, а на проде флаг —
 * обязательное условие деплоя приложения с `src/jobs/` (гейт в `deploy-affected.sh`, добавлен
 * вместе с этим переносом — инцидент studio 2026-08-13, когда флаг забыли и задачи молчали сутки).
 */
export async function startDashboardJobs(): Promise<JobScheduler> {
  if (g.dashboardJobScheduler) {
    return g.dashboardJobScheduler
  }

  const overrides = await loadOverrides()
  const autoSchedule = process.env.JOBS_ENABLED === 'true'
  const scheduler = createJobScheduler({
    connectionString: process.env.DATABASE_URL!,
    jobs,
    overrides,
    autoSchedule,
  })

  await scheduler.start()
  if (!autoSchedule) {
    console.warn('[jobs] JOBS_ENABLED не установлен в "true" — расписание не тикает, доступен только ручной запуск')
  }

  g.dashboardJobScheduler = scheduler
  return scheduler
}

/** Для админки и `/api/jobs/status` — не поднимает планировщик повторно, если уже стартован. */
export async function getDashboardJobStatuses(): Promise<JobStatus[]> {
  const scheduler = g.dashboardJobScheduler ?? (await startDashboardJobs())
  return scheduler.getStatuses()
}

/** Кнопка «Запустить сейчас» в админке — ставит задачу в очередь немедленно. */
export async function runDashboardJobNow(jobId: string): Promise<string | null> {
  const scheduler = g.dashboardJobScheduler ?? (await startDashboardJobs())
  return scheduler.runNow(jobId)
}

/**
 * Применяет оверрайд задачи в уже работающем планировщике сразу после того, как он записан
 * в БД — без этого правка через админку подействовала бы только на следующем деплое.
 */
export async function applyDashboardJobOverride(
  jobId: string,
  override: { schedule: string | null; enabled: boolean | null },
): Promise<void> {
  const scheduler = g.dashboardJobScheduler ?? (await startDashboardJobs())
  await scheduler.setOverride(jobId, override)
}
