/**
 * Наблюдатель за задачами приложений на `@letar/jobs` (pg-boss) — PLAN-INFRA-4.md §75.
 *
 * После тиража §75 (закрыт 2026-09-03, 6 приложений) `dashboard-agent` перестал сам исполнять
 * их крон-задачи — расписание живёт в каждом приложении. Роль агента здесь другая: раз в
 * расписание опросить `GET /api/jobs/status` каждого приложения и заметить две вещи, которые
 * само приложение никак не сигнализирует наружу:
 *
 * 1. **`autoSchedule: false`** — ровно та находка пилота 13.08.2026 (см. §75 в PLAN-INFRA-4.md):
 *    забытый `JOBS_ENABLED=true` в `.env.docker` даёт полную тишину без единой ошибки — контейнер
 *    здоров, `/admin/jobs` не падает, просто ничего не тикает. Раньше это обнаружил владелец
 *    глазами через сутки; наблюдатель ловит на первом же опросе после деплоя.
 * 2. **Пропущенный тик** — задача включена, `autoSchedule: true`, но время, к которому предыдущий
 *    опрос ожидал следующий запуск, уже прошло, а `lastRunAt` за это время не сдвинулся. Сигнал не
 *    требует знания конкретного расписания задачи: `nextRunAt` уже посчитан на стороне приложения
 *    (`computeNextRunAt` в `@letar/jobs`), наблюдатель только сравнивает его с тем, что видел
 *    на прошлом опросе.
 *
 * Оба сигнала дебаунсятся тем же `shouldRepeatAlert`, что email-канарейка и свежесть бэкапов —
 * молчание не наступает никогда, пока проблема жива (см. `alert-policy.ts`).
 *
 * ⚠️ Типы ответа `/api/jobs/status` (`RemoteJobStatus` ниже) — структурная копия `JobStatus` из
 * `libs/jobs/src/lib/types.ts`, не импорт. `Dockerfile.production` этого приложения — намеренно
 * изолированный мини-workspace (см. заголовок `server-config.ts`), а `@letar/jobs` тянет за собой
 * рантайм-зависимость на pg-boss/pg, которая наблюдателю не нужна — он только читает JSON по HTTP.
 * Меняешь `JobStatus` в библиотеке — свериться, что это поле здесь тоже используется.
 */

import { shouldRepeatAlert } from './alert-policy'
import { getAppUrl } from './app-registry'
import { getAppCronSecret } from './app-secrets'
import { postDashboardAlert } from './dashboard-alert'
import { loadJsonState, saveJsonState } from './json-state-file'

/** Приложения, мигрированные на `@letar/jobs` (§75, тираж закрыт 2026-09-03). */
export const JOBS_OBSERVER_APPS = ['dashboard', 'driving-school', 'dsperevod', 'aboi', 'time', 'svoichuzhie'] as const

export type JobsObserverApp = (typeof JOBS_OBSERVER_APPS)[number]

/** Структурная копия `JobStatus` (`libs/jobs/src/lib/types.ts`) — см. заголовок файла. */
export interface RemoteJobStatus {
  id: string
  name: string
  description: string
  schedule: string
  hasOverride: boolean
  enabled: boolean
  lastRunAt: string | null
  lastRunState: 'created' | 'active' | 'completed' | 'failed' | 'cancelled' | 'retry' | null
  lastRunError: string | null
  lastRunDurationMs: number | null
  nextRunAt: string | null
  autoSchedule: boolean
}

const STATE_PATH = process.env.JOBS_OBSERVER_STATE_PATH || '/home/deploy/letar/jobs-observer-state.json'
const FETCH_TIMEOUT_MS = 10_000
/** Алертим сразу на первом же опросе с проблемой — та же логика, что у `backup-freshness.ts`. */
const ALERT_THRESHOLD = 1
/**
 * Запас сверх ожидаемого `nextRunAt`, прежде чем считать тик пропущенным. Не подстраивается под
 * расписание конкретной задачи (среди задач тиража есть `* * * * *` у `time`) — фиксированный
 * запас на джиттер pg-boss и время выполнения самой задачи, настраивается на случай, если
 * дефолт окажется тесен для медленной задачи.
 */
const MISSED_RUN_GRACE_MS = (Number(process.env.JOBS_OBSERVER_MISSED_RUN_GRACE_MINUTES) || 10) * 60 * 1000

export interface AlertFlagState {
  /** Сколько опросов подряд условие держится. Сбрасывается в 0, как только условие снимается. */
  consecutivePolls: number
  /** При каком значении `consecutivePolls` ушёл последний алерт (`null` — ещё ни разу). */
  alertedAtPolls: number | null
  /** Подтвердил ли dashboard приём последнего алерта. `false` → повторяем на следующем опросе. */
  lastAlertDelivered: boolean | null
}

function defaultFlagState(): AlertFlagState {
  return { consecutivePolls: 0, alertedAtPolls: null, lastAlertDelivered: null }
}

interface JobObserverState {
  lastSeenNextRunAt: string | null
  lastSeenLastRunAt: string | null
  noAutoSchedule: AlertFlagState
  missedRun: AlertFlagState
}

function defaultJobState(): JobObserverState {
  return {
    lastSeenNextRunAt: null,
    lastSeenLastRunAt: null,
    noAutoSchedule: defaultFlagState(),
    missedRun: defaultFlagState(),
  }
}

interface AppObserverState {
  fetchFailure: AlertFlagState
  jobs: Record<string, JobObserverState>
}

function defaultAppState(): AppObserverState {
  return { fetchFailure: defaultFlagState(), jobs: {} }
}

interface JobsObserverState {
  apps: Record<string, AppObserverState>
}

function loadState(): JobsObserverState {
  const parsed = loadJsonState<Partial<JobsObserverState>>(STATE_PATH, {})
  return { apps: parsed.apps ?? {} }
}

function saveState(state: JobsObserverState): void {
  saveJsonState(STATE_PATH, state, 'JobsObserver')
}

type FetchStatusResult = { ok: true; jobs: RemoteJobStatus[] } | { ok: false; error: string }

async function fetchJobStatuses(app: string): Promise<FetchStatusResult> {
  const cronSecret = getAppCronSecret(app)
  if (!cronSecret) {
    return { ok: false, error: `CRON_SECRET для ${app} недоступен (/secrets/${app}.env)` }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(getAppUrl(app, '/api/jobs/status'), {
      headers: { 'X-Cron-Secret': cronSecret },
      signal: controller.signal,
    })

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status} ${response.statusText}` }
    }

    const body = (await response.json()) as { ok?: boolean; jobs?: RemoteJobStatus[] }
    if (!body.ok || !Array.isArray(body.jobs)) {
      return { ok: false, error: 'Неожиданная форма ответа /api/jobs/status' }
    }

    return { ok: true, jobs: body.jobs }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Обновляет флаговое состояние одного условия (держится/снято) и, если нужно, шлёт алерт.
 * Общая механика для `noAutoSchedule`/`missedRun`/`fetchFailure` — отличается только вход
 * (условие + содержимое алерта), возврат — новое состояние флага.
 */
async function updateFlag(
  flag: AlertFlagState,
  active: boolean,
  buildAlert: () => { title: string; message: string; metadata: Record<string, unknown> },
): Promise<AlertFlagState> {
  if (!active) {
    return defaultFlagState()
  }

  const consecutivePolls = flag.consecutivePolls + 1
  const shouldAlert = shouldRepeatAlert(
    { alertedAtCount: flag.alertedAtPolls, lastAlertDelivered: flag.lastAlertDelivered },
    consecutivePolls,
    ALERT_THRESHOLD,
  )

  if (!shouldAlert) {
    return { ...flag, consecutivePolls }
  }

  const alert = buildAlert()
  const delivered = await postDashboardAlert({
    type: 'CRON_FAILED',
    severity: 'ERROR',
    title: alert.title,
    message: alert.message,
    metadata: alert.metadata,
  })

  return { consecutivePolls, alertedAtPolls: consecutivePolls, lastAlertDelivered: delivered }
}

export interface JobsObserverJobResult {
  app: string
  jobId: string
  jobName: string
  noAutoScheduleAlerted: boolean
  missedRunAlerted: boolean
}

export interface JobsObserverAppResult {
  app: string
  ok: boolean
  error: string | null
  fetchFailureAlerted: boolean
  jobs: JobsObserverJobResult[]
}

export interface JobsObserverRunResult {
  checkedAt: string
  apps: JobsObserverAppResult[]
}

/** Пропущен ли тик: ожидавшееся время прошло с запасом, а `lastRunAt` его не догнал. */
function isMissedRun(prevNextRunAt: string | null, lastRunAt: string | null, now: number): boolean {
  if (!prevNextRunAt) {
    return false
  }
  const expected = new Date(prevNextRunAt).getTime()
  if (now < expected + MISSED_RUN_GRACE_MS) {
    return false
  }
  if (!lastRunAt) {
    return true
  }
  return new Date(lastRunAt).getTime() <= expected
}

async function checkApp(app: string, prevState: AppObserverState, now: number): Promise<{
  state: AppObserverState
  result: JobsObserverAppResult
}> {
  const fetched = await fetchJobStatuses(app)

  if (!fetched.ok) {
    const fetchFailure = await updateFlag(prevState.fetchFailure, true, () => ({
      title: `Наблюдатель jobs: не удалось получить статус у ${app}`,
      message: fetched.error,
      metadata: { jobId: 'jobs-observer', app },
    }))

    return {
      // Состояние задач приложения не трогаем — снимок недоступен в этом опросе, не значит,
      // что задачи перестали существовать.
      state: { fetchFailure, jobs: prevState.jobs },
      result: {
        app,
        ok: false,
        error: fetched.error,
        fetchFailureAlerted: fetchFailure.alertedAtPolls === fetchFailure.consecutivePolls,
        jobs: [],
      },
    }
  }

  const nextJobs: Record<string, JobObserverState> = {}
  const jobResults: JobsObserverJobResult[] = []

  for (const job of fetched.jobs) {
    const prevJobState = prevState.jobs[job.id] ?? defaultJobState()

    const noAutoScheduleActive = job.enabled && !job.autoSchedule
    const noAutoSchedule = await updateFlag(prevJobState.noAutoSchedule, noAutoScheduleActive, () => ({
      title: `Jobs: «${job.name}» (${app}) не тикает — JOBS_ENABLED не выставлен`,
      message: `Задача включена (\`enabled: true\`), но \`autoSchedule: false\` — расписание не зарегистрировано `
        + `в pg-boss, задача выполнится только вручную. Проверить \`JOBS_ENABLED=true\` в .env.docker `
        + `приложения ${app} (см. PLAN-INFRA-4.md §75, находка пилота 13.08.2026).`,
      metadata: { jobId: job.id, jobName: job.name, app },
    }))

    const missedRunActive = isMissedRun(prevJobState.lastSeenNextRunAt, job.lastRunAt, now)
    const missedRun = await updateFlag(prevJobState.missedRun, missedRunActive, () => ({
      title: `Jobs: «${job.name}» (${app}) давно не отрабатывала успешно`,
      message: `Ожидавшийся запуск (${prevJobState.lastSeenNextRunAt}) прошёл более `
        + `${Math.round(MISSED_RUN_GRACE_MS / 60_000)} мин назад, а последний известный запуск — `
        + `${job.lastRunAt ?? 'ни разу'} (состояние: ${job.lastRunState ?? 'нет данных'}`
        + `${job.lastRunError ? `, ошибка: ${job.lastRunError}` : ''}).`,
      metadata: { jobId: job.id, jobName: job.name, app, lastRunState: job.lastRunState },
    }))

    nextJobs[job.id] = {
      lastSeenNextRunAt: job.nextRunAt,
      lastSeenLastRunAt: job.lastRunAt,
      noAutoSchedule,
      missedRun,
    }

    jobResults.push({
      app,
      jobId: job.id,
      jobName: job.name,
      noAutoScheduleAlerted: noAutoScheduleActive && noAutoSchedule.alertedAtPolls === noAutoSchedule.consecutivePolls,
      missedRunAlerted: missedRunActive && missedRun.alertedAtPolls === missedRun.consecutivePolls,
    })
  }

  return {
    state: { fetchFailure: defaultFlagState(), jobs: nextJobs },
    result: { app, ok: true, error: null, fetchFailureAlerted: false, jobs: jobResults },
  }
}

/**
 * Один опрос всех приложений тиража §75 — вызывается роутом `/api/cron/jobs-observer-check`.
 */
export async function runJobsObserverCheck(): Promise<JobsObserverRunResult> {
  const checkedAt = new Date().toISOString()
  const now = Date.now()
  const prevState = loadState()

  const apps: JobsObserverAppResult[] = []
  const nextAppsState: Record<string, AppObserverState> = {}

  for (const app of JOBS_OBSERVER_APPS) {
    const prevAppState = prevState.apps[app] ?? defaultAppState()
    const { state, result } = await checkApp(app, prevAppState, now)
    nextAppsState[app] = state
    apps.push(result)
  }

  saveState({ apps: nextAppsState })

  return { checkedAt, apps }
}

/** Текущее состояние (для будущего `/admin`-виджета) — без запуска нового опроса. */
export function getJobsObserverState(): JobsObserverState {
  return loadState()
}
