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
import { shouldRepeatAlert } from './alert-policy'
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
  /** Подряд-неудачные прогоны (файлов нет ИЛИ самый свежий устарел). Сбрасывается на 0 при успехе. */
  consecutiveFailures: number
  /**
   * При скольки подряд-неудачах уходил последний алерт (`null` — ещё ни разу).
   * Заменил булев `alerted`: тот взводился однажды и глушил уведомления навсегда, даже пока
   * бэкап продолжал стареть дальше — та же ошибка, что была в email-канарейке (§62).
   */
  alertedAtFailures: number | null
  /** Подтвердил ли dashboard приём последнего алерта. `false` → повторяем на следующем прогоне. */
  lastAlertDelivered: boolean | null
}

/**
 * Алерт шлётся сразу на первую же подряд-неудачу (в отличие от email-канарейки, которая ждёт
 * `ALERT_THRESHOLD` подряд-неудач) — эта проверка и так гоняется раз в 6 часов, а не раз в час,
 * ждать вторую неудачу означало бы узнать о стухшем бэкапе только через 12 часов после первого
 * симптома. Дальше — то же удвоение, что у email-канарейки: 1, 2, 4, 8… подряд-неудач.
 */
const ALERT_THRESHOLD = 1

function defaultFreshnessState(): FreshnessState {
  return { consecutiveFailures: 0, alertedAtFailures: null, lastAlertDelivered: null }
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
 * Цель «бэкап секретов Traefik на s3» — архив создаёт сам агент, см. `traefik-backup.ts`.
 *
 * ⚠️ Отдельная цель, а не расширение `acmeDnsTarget()`: это **другой сервер**. Там s2 и база
 * acme-dns, здесь s3 и файл аккаунтов с тремя per-name аккаунтами. Одна проверка на две машины
 * дала бы ложное «свежо»: свежий архив на s2 закрывал бы отсутствие архива на s3.
 */
export function traefikTarget(): FreshnessTarget {
  return {
    jobId: 'traefik-backup-freshness-check',
    label: 'Traefik (s3)',
    backupDir: process.env.TRAEFIK_BACKUP_DIR || '/home/deploy/letar/backups/traefik',
    statePath: process.env.TRAEFIK_BACKUP_STATE_PATH || '/home/deploy/letar/traefik-backup-freshness-state.json',
    maxAgeHours: Number(process.env.TRAEFIK_BACKUP_MAX_AGE_HOURS) || 30,
    filenamePattern: /^traefik_.*\.tar\.gz$/,
    hint: 'Проверить cron-задачу traefik-backup-s3 и монтирование /home/deploy/lego в контейнер агента на s3. '
      + 'В архиве три per-name аккаунта acme-dns (media/ipfs/gateway) — их потеря невосстановима без владельца: '
      + 'регистрация закрыта, новый аккаунт даст новые fulldomain и потребует переделать три CNAME у регистратора '
      + '— PLAN-INFRA.md §48 M2.',
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
 * Алертит через `BACKUP_FAILED` с повтором вместо разового флага — тот же паттерн, что
 * `email-canary.ts` (`shouldRepeatAlert`): молчание не наступает никогда, пока бэкап стухший.
 * Сбрасывается целиком при появлении свежего файла.
 */
export async function runFreshnessCheck(target: FreshnessTarget): Promise<BackupFreshnessCheckResult> {
  const checkedAt = new Date().toISOString()
  const prevState: FreshnessState = {
    // Слияние с дефолтом обязательно, а не подстановка целиком: на диске может лежать
    // состояние старой формы (булев `alerted`, без счётчика и подтверждения доставки).
    // Без слияния новые поля остались бы `undefined`, и `shouldRepeatAlert` свалился бы
    // в сравнение с NaN — тот же отказ, что уже разобран и починен в email-canary.ts (§62).
    ...defaultFreshnessState(),
    ...loadJsonState<Partial<FreshnessState>>(target.statePath, {}),
  }

  if (!existsSync(target.backupDir)) {
    // Отсутствие каталога — это тоже провал, но алерт не шлём и состояние не трогаем: каталог
    // может ещё не быть создан первым прогоном бэкапа. Провал вернётся вызывающему как error
    // и попадёт в лог cron-задачи.
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

  let newestFileAgeHours: number | null = null
  let stale: boolean
  let error: string | null = null
  let alertTitle: string
  let alertMessage: string
  let alertMetadata: Record<string, unknown>

  if (!newest) {
    stale = true
    error = `В ${target.backupDir} нет ни одного файла, подходящего под ${target.filenamePattern}`
    alertTitle = `Бэкап ${target.label}: файлов не найдено`
    alertMessage = `${error}. ${target.hint}`
    alertMetadata = { jobId: target.jobId, backupDir: target.backupDir }
  } else {
    const hours = ageInHours(newest.mtimeMs, Date.now())
    newestFileAgeHours = hours
    stale = hours > target.maxAgeHours
    alertTitle = `Бэкап ${target.label} устарел (${hours.toFixed(1)} ч)`
    alertMessage = `Самый свежий файл — ${newest.name}, старше порога ${target.maxAgeHours} ч. ${target.hint}`
    alertMetadata = { jobId: target.jobId, backupDir: target.backupDir, newestFile: newest.name, ageHours: hours }
  }

  if (!stale) {
    // Успех обнуляет историю уведомлений — следующий эпизод начнётся с чистого листа.
    saveJsonState(target.statePath, defaultFreshnessState(), 'BackupFreshness')
    return {
      checkedAt,
      backupDir: target.backupDir,
      newestFile: newest?.name ?? null,
      newestFileAgeHours,
      stale: false,
      alerted: false,
      error: null,
    }
  }

  const consecutiveFailures = prevState.consecutiveFailures + 1
  const shouldAlert = shouldRepeatAlert(
    { alertedAtCount: prevState.alertedAtFailures, lastAlertDelivered: prevState.lastAlertDelivered },
    consecutiveFailures,
    ALERT_THRESHOLD,
  )

  let alerted = false
  let nextState: FreshnessState = { ...prevState, consecutiveFailures }

  if (shouldAlert) {
    // Записываем ИСХОД отправки, а не факт вызова — недоставленный алерт заставит
    // `shouldRepeatAlert` повторить попытку на следующем же прогоне.
    const delivered = await postDashboardAlert({
      type: 'BACKUP_FAILED',
      severity: 'ERROR',
      title: alertTitle,
      message: alertMessage,
      metadata: alertMetadata,
    })
    alerted = delivered
    nextState = { ...nextState, alertedAtFailures: consecutiveFailures, lastAlertDelivered: delivered }
  }

  saveJsonState(target.statePath, nextState, 'BackupFreshness')

  return {
    checkedAt,
    backupDir: target.backupDir,
    newestFile: newest?.name ?? null,
    newestFileAgeHours,
    stale: true,
    alerted,
    error,
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

/** Прогон проверки бэкапа Traefik на s3 — роут `/api/cron/traefik-backup-freshness-check` */
export async function runTraefikBackupFreshnessCheck(): Promise<BackupFreshnessCheckResult> {
  return runFreshnessCheck(traefikTarget())
}
