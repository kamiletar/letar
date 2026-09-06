/**
 * Конфигурация cron-задач: чтение/запись `cron-jobs.json`, бутстрап дефолтов,
 * фильтрация по текущему серверу и вывод задач из эксплуатации.
 * Сам каталог дефолтных задач — в `cron-default-jobs.ts`.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { DEFAULT_CRON_JOBS, RETIRED_JOB_IDS } from './cron-default-jobs'
import type { CronJob } from './cron-types'
import { getCurrentServer, SERVER_APPS } from './server-config'

// Путь к конфигу (используем примонтированный volume /home/deploy/letar)
const CONFIG_PATH = '/home/deploy/letar/cron-jobs.json'

/**
 * Фильтрует задачи для текущего сервера
 */
export function filterJobsForCurrentServer(jobs: CronJob[]): CronJob[] {
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

  // Обновляем существующие задачи если их app/endpoint/server/timeoutMs изменились в дефолтах.
  // `schedule`/`enabled`/`description` намеренно НЕ в этом списке — они редактируются через UI
  // дашборда и код их обратно не перетирает (PLAN-INFRA.md §56, решение владельца 2026-09-03:
  // расписание — UI-only, DEFAULT_CRON_JOBS задаёт только стартовое значение при первом создании).
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
