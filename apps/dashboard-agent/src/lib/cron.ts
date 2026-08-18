/**
 * Cron Module for Dashboard Agent
 * Планировщик cron задач с in-memory хранением логов
 */

import CronParser from 'cron-parser'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import * as cron from 'node-cron'
import { getAppUrl } from './app-registry'
import { getAppCronSecret } from './app-secrets'
import { postDashboardAlert } from './dashboard-alert'
import { getRedis } from './redis'
import { type CronServer, getCurrentServer, SERVER_APPS } from './server-config'

export type { CronServer }

// =============================================================================
// Типы
// =============================================================================

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

/**
 * Фильтрует задачи для текущего сервера
 */
function filterJobsForCurrentServer(jobs: CronJob[]): CronJob[] {
  const currentServer = getCurrentServer()

  return jobs.filter((job) => {
    // Если явно указан сервер — используем его
    if (job.server) {
      return job.server === currentServer
    }

    // Иначе определяем по приложению
    const appServer = SERVER_APPS[job.app]
    if (!appServer) {
      console.warn(`[Cron] Неизвестное приложение "${job.app}" для задачи "${job.id}", пропускаем`)
      return false
    }

    return appServer === currentServer
  })
}

// =============================================================================
// Глобальное состояние
// =============================================================================

// Scheduled задачи (node-cron tasks)
const scheduledTasks = new Map<string, cron.ScheduledTask>()

// In-memory хранилище логов (последние N записей на задачу), персистится в Redis
// (best-effort, см. persistJobLogs/rehydrateExecutionLogsFromRedis ниже) — переживает
// рестарт контейнера, тот же паттерн, что deployHistory в routes/deploy.ts. Закрывает
// Backlog «Логи cron-задач в памяти, CronExecutionLog в БД dashboard — мёртвая модель»:
// dashboard-agent пишет в свою Redis-персистентность вместо БД dashboard (та модель никем
// не читалась и не писалась — по-прежнему остаётся мёртвой, решение по ней отдельное).
/** Таймаут HTTP-запроса к эндпоинту задачи по умолчанию — переопределяется `CronJob.timeoutMs`. */
const DEFAULT_TIMEOUT_MS = 60_000

const MAX_LOGS_PER_JOB = 50
const executionLogs = new Map<string, CronExecutionLog[]>()

const CRON_REDIS_KEY_PREFIX = 'dashboard-agent:cron:'
const CRON_REDIS_JOBS_SET_KEY = `${CRON_REDIS_KEY_PREFIX}jobs`
const CRON_REDIS_ITEM_TTL_SEC = 30 * 24 * 60 * 60

function cronRedisLogsKey(jobId: string): string {
  return `${CRON_REDIS_KEY_PREFIX}logs:${jobId}`
}

/** Немедленный best-effort персист всех логов одной задачи целиком (список короткий — MAX_LOGS_PER_JOB) */
async function persistJobLogs(jobId: string): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }
  try {
    const logs = executionLogs.get(jobId) || []
    await r.set(cronRedisLogsKey(jobId), JSON.stringify(logs), 'EX', CRON_REDIS_ITEM_TTL_SEC)
    await r.sadd(CRON_REDIS_JOBS_SET_KEY, jobId)
  } catch {
    // Не критично — следующий вызов executeJob попробует снова
  }
}

/**
 * Восстанавливает executionLogs из Redis при старте процесса. Записи, застигнутые в
 * статусе running (агент перезапустился посреди выполнения задачи), помечаются error —
 * реальный исход неизвестен dashboard-agent'у после рестарта.
 */
export async function rehydrateExecutionLogsFromRedis(): Promise<void> {
  const r = getRedis()
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
        executionLogs.set(jobId, logs)
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

// Путь к конфигу (используем примонтированный volume /home/deploy/letar)
const CONFIG_PATH = '/home/deploy/letar/cron-jobs.json'

// =============================================================================
// Конфигурация
// =============================================================================

/**
 * Дефолтные задачи для ВСЕХ серверов
 * Фильтруются по текущему серверу при загрузке
 */
const DEFAULT_CRON_JOBS: CronJob[] = [
  {
    id: 'nginx-backup-s2',
    name: 'Nginx Backup S2',
    app: 'dashboard-agent',
    endpoint: '/api/nginx/backup',
    schedule: '0 3 * * *',
    description: 'Автоматический бэкап Nginx Proxy Manager на s2 (data + SSL сертификаты)',
    enabled: true,
    server: 's2',
  },
  {
    id: 's2-database-backup',
    name: 'Database Backup (s2)',
    app: 'dashboard-agent',
    endpoint: '/api/database/backup',
    // ⚠️ `0 4`, а не `0 2`: до 2026-08-07 здесь стояло `0 2 * * *`, но на проде задача давно
    // выполняется в 4:00 — расписание сдвинули через API/UI, а обратно в git оно не попало
    // (`0 4 * * *` не встречается ни в одном коммите). Код разъезжался с фактом минимум с
    // 2026-07-10 и вводил в заблуждение всех, кто его читал. Приведено к реальному значению.
    // Разъезд возможен потому, что merge при старте не синхронизирует `schedule` — PLAN-INFRA.md §56.
    // В 3:00 идут бэкап nginx и чистка логов, в 3:30 — acme-dns, так что 4:00 разводит их по времени.
    schedule: '0 4 * * *',
    description: 'Автоматический бэкап всех БД на s2 из APP_CONFIG (см. database.ts)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'driving-school-cleanup-api-logs',
    name: 'API Logs Cleanup',
    app: 'driving-school',
    endpoint: '/api/cron/cleanup-api-logs',
    schedule: '0 3 * * *',
    description: 'Удаление API логов старше 30 дней',
    enabled: true,
  },
  {
    id: 'dsperevod-email-health-check',
    name: 'Email Health Check (dsperevod)',
    app: 'dsperevod',
    endpoint: '/api/cron/email-health-check',
    schedule: '0 */6 * * *',
    description: 'Проверка SMTP-транспорта (Яндекс) — уведомления менеджеру о заявках зависят от него',
    enabled: true,
    server: 's2',
  },
  {
    id: 'aboi-approve-referrals',
    name: 'Approve Referrals (aboi)',
    app: 'aboi',
    endpoint: '/api/cron/approve-referrals',
    // Мигрирован со старого паттерна (внешний crontab, "Authorization: Bearer") на
    // verifyCronSecret() — раньше расписание 0 3 * * * жило только в комментарии
    // .env.docker.example, не факт, что crontab был когда-либо реально настроен на сервере.
    schedule: '0 3 * * *',
    description: 'Переводит реферальные earnings из PENDING в APPROVED по истечении pendingUntil',
    enabled: true,
    server: 's2',
  },
  {
    id: 'aboi-birthday-promo',
    name: 'Birthday Promo (aboi)',
    app: 'aboi',
    endpoint: '/api/cron/birthday-promo',
    schedule: '0 8 * * *',
    description: 'Промокод на скидку клиентам, у которых день рождения через 14 дней (PLAN.md §8)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'aboi-abandoned-cart',
    name: 'Abandoned Cart (aboi)',
    app: 'aboi',
    endpoint: '/api/cron/abandoned-cart',
    // Порог брошенности — 24 часа (lib/abandoned-cart.ts), часовой прогон ловит корзину
    // почти сразу как она пересекает порог, дедуп через Cart.abandonedEmailSentAt.
    schedule: '0 * * * *',
    description: 'Письмо клиентам с непустой корзиной, не тронутой 24 часа (§R.3 PLAN_MARKETING.md)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'email-canary-check',
    name: 'Email Canary Check',
    app: 'dashboard-agent',
    endpoint: '/api/cron/email-canary-check',
    // Раз в час, а не каждые 15 минут. Прежняя частота давала 96 писем в сутки в оба ящика —
    // избыточно для проверки «ходит ли почта вообще», и сама по себе спам-признак: одинаковые
    // письма каждые 15 минут. Порог алерта снижен с 3 до 2, поэтому время до уведомления
    // выросло не в 4 раза, а с 45 минут до 2 часов — для этого класса аварий приемлемо (§62).
    schedule: '0 * * * *',
    description:
      'Канареечный round-trip доставки email (Этап 0.7): SMTP-отправка через canary@letar.best + IMAP-проверка внутренней и внешней ноги',
    enabled: true,
    server: 's2',
    // Дефолтный DEFAULT_TIMEOUT_MS (60с) короче собственного бюджета проверки: internal/external
    // ноги идут параллельно, каждая ждёт письмо до 105с (waitForCanaryMessage: POLL_TIMEOUT_MS 90с +
    // hard deadline 15с — см. apps/dashboard-agent/src/lib/email-canary.ts). Раннер обрывал HTTP-запрос
    // раньше, чем проверка успевала закончиться сама, и это выглядело как провал ("This operation
    // was aborted"), хотя внутри письмо могло дойти вовремя. 130с — 105с ноги + запас на отправку
    // письма и сетевые издержки.
    timeoutMs: 130_000,
  },
  {
    id: 'dashboard-heartbeat',
    name: 'Heartbeat (dashboard)',
    app: 'dashboard',
    endpoint: '/api/cron/heartbeat',
    schedule: '0 21 * * *',
    description: 'Если за 24ч не было ни одного Alert — уведомление в Telegram о живости канала',
    enabled: true,
    server: 's2',
  },
  {
    id: 'maddy-backup-freshness-check',
    name: 'Maddy Backup Freshness Check',
    app: 'dashboard-agent',
    endpoint: '/api/cron/backup-freshness-check',
    schedule: '0 */6 * * *',
    description:
      'Проверка свежести бэкапа Maddy (Этап 0.3): алерт BACKUP_FAILED, если самый новый maddy_*.tar.gz в /home/deploy/letar/backups/maddy старше 30ч — урок инцидента 2026-07-28 (26 дней простоя незамеченными)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'acme-dns-backup-s2',
    name: 'acme-dns Backup S2',
    app: 'dashboard-agent',
    endpoint: '/api/acme-dns/backup',
    schedule: '30 3 * * *',
    description:
      'Бэкап acme-dns на s2 (база выданных поддоменов + файл аккаунтов lego). От сервиса зависит продление ВСЕХ сертификатов зоны, а файл аккаунтов невосстановим — PLAN-INFRA.md §48',
    enabled: true,
    server: 's2',
  },
  {
    id: 'acme-dns-backup-freshness-check',
    name: 'acme-dns Backup Freshness Check',
    app: 'dashboard-agent',
    endpoint: '/api/cron/acme-dns-backup-freshness-check',
    schedule: '15 */6 * * *',
    description:
      'Проверка свежести бэкапа acme-dns (§48): алерт BACKUP_FAILED, если самый новый acme-dns_*.tar.gz старше 30ч. Сам бэкап делает агент, но молчаливый отказ tar/прав на файл аккаунтов выглядел бы как «всё хорошо» до ближайшего продления сертификата',
    enabled: true,
    server: 's2',
  },
  {
    id: 'traefik-backup-s3',
    name: 'Traefik Secrets Backup S3',
    app: 'dashboard-agent',
    endpoint: '/api/traefik/backup',
    schedule: '45 3 * * *',
    description:
      'Бэкап секретов Traefik на s3 (три per-name аккаунта acme-dns + acme.json + basicAuth). Заведён после переезда s3 на Traefik: до него на s3 действительно нечего было бэкапить, теперь там лежит невосстановимое — PLAN-INFRA.md §48 M2',
    enabled: true,
    server: 's3',
  },
  {
    id: 'traefik-backup-freshness-check',
    name: 'Traefik Backup Freshness Check (s3)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/traefik-backup-freshness-check',
    schedule: '30 */6 * * *',
    description:
      'Проверка свежести бэкапа Traefik на s3: алерт BACKUP_FAILED, если самый новый traefik_*.tar.gz старше 30ч. Отдельно от acme-dns-проверки — другой сервер, и свежий архив на s2 не должен закрывать отсутствие архива на s3',
    enabled: true,
    server: 's3',
  },
  {
    id: 'health-check',
    name: 'Health Check (CPU/память/диск/контейнеры/БД)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/health-check',
    schedule: '*/5 * * * *',
    description:
      'Проверка порогов CPU/память/диск (по умолчанию 90%), Docker-контейнеров (down/restarting) и доступности БД — алерты CPU_HIGH/MEMORY_HIGH/DISK_HIGH/CONTAINER_DOWN/CONTAINER_RESTARTED/DATABASE_DOWN (Backlog «Алерты при превышении порогов», P2, эти типы существовали в DashboardAlertType с самого начала, но никогда не вызывались)',
    enabled: true,
    server: 's2',
  },
  {
    id: 'docker-prune',
    name: 'Docker Prune (dangling-образы + builder-кэш)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/docker-prune',
    schedule: '0 4 * * *',
    description:
      'Ежедневная безопасная чистка Docker: `pruneImages` без `-a` удаляет только dangling-образы (осиротевшие слои после того, как `deploy-affected.sh` переставил тег `:latest`/`:staging` на новый билд), `pruneBuilder` без фильтров — только неиспользуемый build-кэш. Не трогает ничего, на что есть тег или ссылка контейнера — SHA-теги для отката (последние 3, retention в deploy-affected.sh) не задевает. Без этой задачи dangling-слои копились неограниченно: диск s2 дошёл до 91% (см. `health-check.ts` — DISK_HIGH дедуп по mount вместо fs).',
    enabled: true,
    server: 's2',
  },
  {
    id: 'log-scan',
    name: 'Log Scan (сканирование логов контейнеров на ошибки)',
    app: 'dashboard-agent',
    endpoint: '/api/cron/log-scan',
    schedule: '*/10 * * * *',
    description:
      'Сканирует хвост логов запущенных контейнеров на строки с ошибками (error/exception/fatal/panic и т.п.), алертит CRON_FAILED по новым находкам с курсором per-контейнер, чтобы не повторять уже виденные строки (Backlog «Улучшения сбора метрик»)',
    enabled: true,
    server: 's2',
  },
  {
    id: 's2-pageview-count',
    name: 'Page View Counter (NPM access logs)',
    app: 'dashboard',
    endpoint: '/api/cron/pageview-count',
    schedule: '*/10 * * * *',
    description:
      'Инкрементальный парсинг access-логов Nginx Proxy Manager в грубый счётчик hits/day/domain без ПДн — дополняет Umami там, где cookie-consent gate не пропускает часть трафика (см. lib/pageview-counter.ts в dashboard)',
    enabled: true,
    server: 's2',
  },
  {
    id: 's2-ssl-check',
    name: 'SSL Certificate Expiry Check',
    app: 'dashboard',
    endpoint: '/api/cron/ssl-check',
    schedule: '0 8 * * *',
    description:
      'Проверка сроков действия SSL сертификатов в Nginx Proxy Manager, алерт SSL_EXPIRING с Telegram уведомлением при истечении/скором истечении (см. lib/ssl-monitor.ts в dashboard)',
    enabled: true,
    server: 's2',
  },
]

/**
 * Задачи, выводимые из эксплуатации через репозиторий (PLAN-INFRA.md §56). `loadAllCronJobs()`
 * добавляет недостающие дефолты, но никогда не удаляет записи — задача, убранная из
 * `DEFAULT_CRON_JOBS`, раньше продолжала жить на проде вечно (DELETE-ручки у API агента нет).
 * Перечисли сюда `id` задачи, которую нужно снять — она будет удалена из `cron-jobs.json`
 * при следующей загрузке конфигурации на каждом сервере, где она встретится. Держать здесь
 * долго не нужно: после того как задача реально пропала со всех серверов, id можно убрать
 * из этого списка (или оставить — повторная фильтрация над уже пустым множеством безвредна).
 */
const RETIRED_JOB_IDS: string[] = [
  // Пилот @letar/jobs (PLAN-INFRA §75) — 6 задач studio переехали из HTTP-ручек
  // /api/cron/* (удалены из кода studio) в планировщик поверх pg-boss внутри самого
  // приложения. ⚠️ ПОРЯДОК ДЕПЛОЯ ВАЖЕН: этот список не должен уйти на прод раньше, чем
  // studio задеплоена с новым планировщиком и `JOBS_ENABLED=true` — иначе есть окно, где
  // задачи не выполняет никто. Деплоить студию и dashboard-agent в одном окне, студию
  // первой (её роуты `/api/cron/*` уже удалены — старые вызовы агента будут получать 404
  // до этого момента, если деплой dashboard-agent случайно окажется раньше).
  'studio-send-reminders',
  'studio-recurring-invoices',
  'studio-close-stale-timers',
  'studio-check-budget-alerts',
  'studio-biweekly-hourly-invoices',
  'studio-check-long-timers',
]

/**
 * Убирает из списка задачи с id из `retiredIds` — чистая функция, вынесена отдельно от
 * `loadAllCronJobs()` ради юнит-теста без мока файловой системы.
 */
export function applyRetirement(
  jobs: CronJob[],
  retiredIds: readonly string[],
): { jobs: CronJob[]; removed: string[] } {
  if (retiredIds.length === 0) {
    return { jobs, removed: [] }
  }
  const retired = new Set(retiredIds)
  const removed = jobs.filter((j) => retired.has(j.id)).map((j) => j.id)
  if (removed.length === 0) {
    return { jobs, removed: [] }
  }
  return { jobs: jobs.filter((j) => !retired.has(j.id)), removed }
}

/**
 * Читает файл конфигурации как есть, без бутстрапа дефолтов и без побочных эффектов.
 * `null` — файла нет или он не читается/не парсится. Единственная точка чтения с диска —
 * `loadAllCronJobs()` и `saveCronConfig()` шарят её вместо того, чтобы вызывать друг друга
 * (раньше `loadAllCronJobs()` при отсутствующей директории конфига звала `saveCronConfig()`,
 * которая снова звала `loadAllCronJobs()` — взаимная рекурсия до `RangeError: Maximum call stack
 * size exceeded`, обнаружено локально при отсутствии смонтированного `/home/deploy/letar`).
 */
function readCronJobsFile(): CronJob[] | null {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return null
    }
    const content = readFileSync(CONFIG_PATH, 'utf-8')
    const config = JSON.parse(content) as { jobs: CronJob[] }
    return config.jobs
  } catch (error) {
    console.error('[Cron] Ошибка загрузки конфигурации:', error)
    return null
  }
}

/** Пишет список задач на диск как есть — низкоуровневый примитив без чтения/мержа. */
function writeCronJobsFile(jobs: CronJob[]): void {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify({ jobs }, null, 2), 'utf-8')
  } catch (error) {
    console.error('[Cron] Ошибка сохранения конфигурации:', error)
  }
}

/**
 * Загружает ВСЕ задачи из конфигурации (без фильтрации).
 * Новые дефолтные задачи автоматически добавляются в существующий конфиг.
 */
function loadAllCronJobs(): CronJob[] {
  const existingJobs = readCronJobsFile()

  if (existingJobs === null) {
    // Файла нет вообще (первый запуск) — создаём дефолтный конфиг напрямую, без saveCronConfig()
    writeCronJobsFile(DEFAULT_CRON_JOBS)
    return DEFAULT_CRON_JOBS
  }

  // Обновляем существующие задачи если их app/endpoint/server/timeoutMs изменились в дефолтах
  let hasChanges = false
  const updatedJobs = existingJobs.map((existing) => {
    const defaultJob = DEFAULT_CRON_JOBS.find((d) => d.id === existing.id)
    if (
      defaultJob
      && (defaultJob.app !== existing.app
        || defaultJob.endpoint !== existing.endpoint
        || defaultJob.server !== existing.server
        || defaultJob.timeoutMs !== existing.timeoutMs)
    ) {
      console.warn(
        `[Cron] Обновление задачи "${existing.id}": app=${existing.app}→${defaultJob.app}, endpoint=${existing.endpoint}→${defaultJob.endpoint}, timeoutMs=${existing.timeoutMs}→${defaultJob.timeoutMs}`,
      )
      hasChanges = true
      return {
        ...existing,
        app: defaultJob.app,
        endpoint: defaultJob.endpoint,
        server: defaultJob.server,
        timeoutMs: defaultJob.timeoutMs,
      }
    }
    return existing
  })

  // Добавляем дефолтные задачи которых ещё нет в конфиге
  const existingIds = new Set(updatedJobs.map((j) => j.id))
  const newDefaults = DEFAULT_CRON_JOBS.filter((j) => !existingIds.has(j.id))

  let merged = [...updatedJobs, ...newDefaults]
  let mergedHasChanges = hasChanges || newDefaults.length > 0
  if (newDefaults.length > 0) {
    console.warn(`[Cron] Добавлено ${newDefaults.length} новых задач: ${newDefaults.map((j) => j.id).join(', ')}`)
  }

  // Вывод задач из эксплуатации (PLAN-INFRA.md §56) — после добавления дефолтов, чтобы задача,
  // одновременно и переехавшая в RETIRED_JOB_IDS, и всё ещё числящаяся в DEFAULT_CRON_JOBS по
  // ошибке, гарантированно не пережила фильтр (ретир побеждает).
  const retirement = applyRetirement(merged, RETIRED_JOB_IDS)
  if (retirement.removed.length > 0) {
    console.warn(`[Cron] Выведены из эксплуатации: ${retirement.removed.join(', ')}`)
    merged = retirement.jobs
    mergedHasChanges = true
  }

  if (mergedHasChanges) {
    writeCronJobsFile(merged)
    return merged
  }

  return updatedJobs
}

/**
 * Загрузка конфигурации cron задач с фильтрацией по серверу
 */
export function loadCronConfig(): CronJob[] {
  const allJobs = loadAllCronJobs()
  const filteredJobs = filterJobsForCurrentServer(allJobs)

  const currentServer = getCurrentServer()
  console.warn(`[Cron] Сервер: ${currentServer}, загружено ${filteredJobs.length} из ${allJobs.length} задач`)

  return filteredJobs
}

/**
 * Сохранение конфигурации (мержит с задачами других серверов)
 */
export function saveCronConfig(updatedJobs: CronJob[]): void {
  const currentServer = getCurrentServer()

  // Читаем файл напрямую (не через loadAllCronJobs() — та при бутстрапе сама пишет
  // DEFAULT_CRON_JOBS, вызывать её отсюда не нужно и опасно рекурсией). Нет файла — нет и чужих
  // задач других серверов для сохранения, начинаем с пустого списка.
  const allJobs = readCronJobsFile() ?? []

  // Отделяем задачи других серверов
  const otherServerJobs = allJobs.filter((job) => {
    if (job.server) {
      return job.server !== currentServer
    }
    const appServer = SERVER_APPS[job.app]
    return appServer !== currentServer
  })

  // Объединяем
  const mergedJobs = [...otherServerJobs, ...updatedJobs]

  writeCronJobsFile(mergedJobs)
}

// =============================================================================
// Планировщик
// =============================================================================

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

// =============================================================================
// Выполнение задач
// =============================================================================

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
 * Генерация ID для лога
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Добавление лога в хранилище
 */
function addLog(log: CronExecutionLog): void {
  const logs = executionLogs.get(log.jobId) || []
  logs.unshift(log)

  // Ограничиваем количество логов
  if (logs.length > MAX_LOGS_PER_JOB) {
    logs.pop()
  }

  executionLogs.set(log.jobId, logs)
  void persistJobLogs(log.jobId)
}

/**
 * Обновление лога
 */
function updateLog(logId: string, jobId: string, updates: Partial<CronExecutionLog>): void {
  const logs = executionLogs.get(jobId) || []
  const index = logs.findIndex((l) => l.id === logId)
  if (index !== -1) {
    logs[index] = { ...logs[index], ...updates }
  }
  void persistJobLogs(jobId)
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

// =============================================================================
// Получение данных
// =============================================================================

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
 * Получение последнего лога задачи
 */
export function getLastJobLog(jobId: string): CronExecutionLog | null {
  const logs = executionLogs.get(jobId) || []
  return logs[0] || null
}

/**
 * Получение логов задачи
 */
export function getJobLogs(jobId: string, limit = 20): CronExecutionLog[] {
  const logs = executionLogs.get(jobId) || []
  return logs.slice(0, limit)
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
