/**
 * Проверка свежести бэкапов, которые создаются ВНЕ dashboard-agent
 * (Этап 0.3 корневого PLAN.md, PLAN-INFRA.md §48).
 *
 * Урок инцидента 2026-07-28: бэкапы Maddy не шли 26 дней незамеченно — cron и SSH-ключ
 * снесло пересозданием `mail.letar.best`, обнаружено только при внеплановой проверке.
 * Этот модуль не проверяет доставку email (это `email-canary.ts`) и не создаёт бэкапы —
 * только сам факт, что в каталоге появляется свежий архив.
 *
 * `/home/deploy/letar` смонтирован в контейнер dashboard-agent 1-в-1 с хостом
 * (`docker-compose.production.yml`), поэтому обычный `fs.readdir` видит те же файлы,
 * что и `rsync` с mail-сервера или локальный tar.
 *
 * Целей проверки две, и они разные по природе отказа:
 *
 * - **Maddy** — бэкап приезжает по `rsync` с другого сервера. Отказать может cron, SSH-ключ,
 *   сам скрипт (дважды уже отказывал, см. §42).
 * - **acme-dns** — бэкап делает сам агент (`acme-dns-backup.ts`). Отказать может tar, права
 *   на файл аккаунтов lego или отключённая cron-задача. Цена молчаливого отказа выше, чем
 *   у Maddy: без файла аккаунтов ACME-клиент не сможет обновлять `TXT`, а восстановить его
 *   нельзя — регистрация в acme-dns закрыта, а новый аккаунт дал бы новый `fulldomain`,
 *   то есть потребовал бы правки боевой `CNAME`-записи в зоне.
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { postDashboardAlert } from './dashboard-alert'
import { loadJsonState, saveJsonState } from './json-state-file'

/** Описание одной проверяемой цели — всё, чем отличается Maddy от acme-dns */
export interface FreshnessTarget {
  /** Идентификатор для метаданных алерта; совпадает с id cron-задачи */
  jobId: string
  /** Человекочитаемое имя для заголовка алерта («Maddy», «acme-dns») */
  label: string
  backupDir: string
  statePath: string
  maxAgeHours: number
  filenamePattern: RegExp
  /** Что проверять руками, когда алерт всё-таки прилетел */
  hint: string
}

export interface BackupFreshnessCheckResult {
  checkedAt: string
  backupDir: string
  newestFile: string | null
  newestFileAgeHours: number | null
  stale: boolean
  alerted: boolean
  error: string | null
}

interface FreshnessState {
  alerted: boolean
}

/**
 * Цель «бэкап Maddy» — архив приезжает по rsync с mail-сервера.
 *
 * Переменные окружения читаются при вызове, а не при импорте модуля: иначе тест не сможет
 * подставить временный каталог, а прод получит значения, замороженные на момент старта.
 */
export function maddyTarget(): FreshnessTarget {
  return {
    jobId: 'maddy-backup-freshness-check',
    label: 'Maddy',
    backupDir: process.env.MADDY_BACKUP_DIR || '/home/deploy/letar/backups/maddy',
    statePath: process.env.MADDY_BACKUP_STATE_PATH || '/home/deploy/letar/maddy-backup-freshness-state.json',
    maxAgeHours: Number(process.env.MADDY_BACKUP_MAX_AGE_HOURS) || 30,
    filenamePattern: /^maddy_.*\.tar\.gz$/,
    hint: 'Проверить cron/SSH-ключ на mail-сервере (см. PLAN.md Этап 0.3, инциденты 2026-07-28 и §42).',
  }
}

/** Цель «бэкап acme-dns» — архив создаёт сам агент, см. `acme-dns-backup.ts` */
export function acmeDnsTarget(): FreshnessTarget {
  return {
    jobId: 'acme-dns-backup-freshness-check',
    label: 'acme-dns',
    backupDir: process.env.ACME_DNS_BACKUP_DIR || '/home/deploy/letar/backups/acme-dns',
    statePath: process.env.ACME_DNS_BACKUP_STATE_PATH || '/home/deploy/letar/acme-dns-backup-freshness-state.json',
    maxAgeHours: Number(process.env.ACME_DNS_BACKUP_MAX_AGE_HOURS) || 30,
    filenamePattern: /^acme-dns_.*\.tar\.gz$/,
    hint: 'Проверить cron-задачу acme-dns-backup-s2 и права на /home/deploy/lego/acme-dns-accounts.json. '
      + 'Без файла аккаунтов продление ВСЕХ сертификатов зоны встанет, а восстановить его нельзя '
      + '(регистрация в acme-dns закрыта, новый аккаунт потребует правки CNAME в боевой зоне) — PLAN-INFRA.md §48.',
  }
}

/**
 * Возраст файла в часах. Вынесено отдельно, потому что это единственное место, где
 * решается «устарел или нет», и его надо уметь проверить без файловой системы и без часов.
 */
export function ageInHours(mtimeMs: number, nowMs: number): number {
  return (nowMs - mtimeMs) / (1000 * 60 * 60)
}

export function findNewestBackupFile(dir: string, pattern: RegExp): { name: string; mtimeMs: number } | null {
  const entries = readdirSync(dir).filter((name) => pattern.test(name))

  let newest: { name: string; mtimeMs: number } | null = null
  for (const name of entries) {
    const { mtimeMs } = statSync(`${dir}/${name}`)
    if (!newest || mtimeMs > newest.mtimeMs) {
      newest = { name, mtimeMs }
    }
  }
  return newest
}

/**
 * Один прогон проверки одной цели.
 *
 * Алертит через `BACKUP_FAILED` с дебаунсом: один алерт на непрерывный эпизод устаревания,
 * сбрасывается при появлении свежего файла — тот же паттерн, что `email-canary.ts`.
 */
export async function runFreshnessCheck(target: FreshnessTarget): Promise<BackupFreshnessCheckResult> {
  const checkedAt = new Date().toISOString()
  const prevState = loadJsonState<FreshnessState>(target.statePath, { alerted: false })

  if (!existsSync(target.backupDir)) {
    // Отсутствие каталога — это тоже провал, но алерт не шлём: каталог может ещё не быть
    // создан первым прогоном бэкапа. Провал вернётся вызывающему как error и попадёт
    // в лог cron-задачи.
    return {
      checkedAt,
      backupDir: target.backupDir,
      newestFile: null,
      newestFileAgeHours: null,
      stale: true,
      alerted: false,
      error: `Директория бэкапов не найдена: ${target.backupDir}`,
    }
  }

  const newest = findNewestBackupFile(target.backupDir, target.filenamePattern)

  if (!newest) {
    const detail = `В ${target.backupDir} нет ни одного файла, подходящего под ${target.filenamePattern}`
    let alerted = false
    if (!prevState.alerted) {
      await postDashboardAlert({
        type: 'BACKUP_FAILED',
        severity: 'ERROR',
        title: `Бэкап ${target.label}: файлов не найдено`,
        message: `${detail}. ${target.hint}`,
        metadata: { jobId: target.jobId, backupDir: target.backupDir },
      })
      alerted = true
    }
    saveJsonState(target.statePath, { alerted: true }, 'BackupFreshness')
    return {
      checkedAt,
      backupDir: target.backupDir,
      newestFile: null,
      newestFileAgeHours: null,
      stale: true,
      alerted,
      error: detail,
    }
  }

  const hours = ageInHours(newest.mtimeMs, Date.now())
  const stale = hours > target.maxAgeHours

  let alerted = false
  if (stale && !prevState.alerted) {
    await postDashboardAlert({
      type: 'BACKUP_FAILED',
      severity: 'ERROR',
      title: `Бэкап ${target.label} устарел (${hours.toFixed(1)} ч)`,
      message: `Самый свежий файл — ${newest.name}, старше порога ${target.maxAgeHours} ч. ${target.hint}`,
      metadata: { jobId: target.jobId, backupDir: target.backupDir, newestFile: newest.name, ageHours: hours },
    })
    alerted = true
  }

  saveJsonState(target.statePath, { alerted: stale }, 'BackupFreshness')

  return {
    checkedAt,
    backupDir: target.backupDir,
    newestFile: newest.name,
    newestFileAgeHours: hours,
    stale,
    alerted,
    error: null,
  }
}

/** Прогон проверки бэкапа Maddy — вызывается роутом `/api/cron/backup-freshness-check` */
export async function runBackupFreshnessCheck(): Promise<BackupFreshnessCheckResult> {
  return runFreshnessCheck(maddyTarget())
}

/** Прогон проверки бэкапа acme-dns — вызывается роутом `/api/cron/acme-dns-backup-freshness-check` */
export async function runAcmeDnsBackupFreshnessCheck(): Promise<BackupFreshnessCheckResult> {
  return runFreshnessCheck(acmeDnsTarget())
}
