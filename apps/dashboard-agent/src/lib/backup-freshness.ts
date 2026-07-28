/**
 * Проверка свежести бэкапа Maddy (Этап 0.3 корневого PLAN.md).
 *
 * Урок инцидента 2026-07-28: бэкапы Maddy не шли 26 дней незамеченно — cron и SSH-ключ
 * снесло пересозданием `mail.letar.best`, обнаружено только при внеплановой проверке.
 * Этот cron не проверяет доставку email (это `email-canary.ts`) — только сам факт, что
 * файл `maddy_*.tar.gz` в `/home/deploy/letar/backups/maddy` обновлялся в последние N часов.
 *
 * `/home/deploy/letar` смонтирован в контейнер dashboard-agent 1-в-1 с хостом
 * (`docker-compose.production.yml`), поэтому обычный `fs.readdir` видит те же файлы,
 * что и `rsync` с mail-сервера.
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { postDashboardAlert } from './dashboard-alert'
import { loadJsonState, saveJsonState } from './json-state-file'

const BACKUP_DIR = process.env.MADDY_BACKUP_DIR || '/home/deploy/letar/backups/maddy'
const STATE_PATH = process.env.MADDY_BACKUP_STATE_PATH || '/home/deploy/letar/maddy-backup-freshness-state.json'
const MAX_AGE_HOURS = Number(process.env.MADDY_BACKUP_MAX_AGE_HOURS) || 30
const FILENAME_PATTERN = /^maddy_.*\.tar\.gz$/

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

function loadState(): FreshnessState {
  return loadJsonState<FreshnessState>(STATE_PATH, { alerted: false })
}

function saveState(state: FreshnessState): void {
  saveJsonState(STATE_PATH, state, 'BackupFreshness')
}

function findNewestBackupFile(dir: string): { name: string; mtimeMs: number } | null {
  const entries = readdirSync(dir).filter((name) => FILENAME_PATTERN.test(name))

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
 * Один прогон проверки — вызывается роутом `/api/cron/backup-freshness-check`.
 * Алертит через `BACKUP_FAILED` (дебаунс: один алерт на непрерывный эпизод устаревания,
 * сбрасывается при появлении свежего файла — тот же паттерн, что `email-canary.ts`).
 */
export async function runBackupFreshnessCheck(): Promise<BackupFreshnessCheckResult> {
  const checkedAt = new Date().toISOString()
  const prevState = loadState()

  if (!existsSync(BACKUP_DIR)) {
    return {
      checkedAt,
      backupDir: BACKUP_DIR,
      newestFile: null,
      newestFileAgeHours: null,
      stale: true,
      alerted: false,
      error: `Директория бэкапов не найдена: ${BACKUP_DIR}`,
    }
  }

  const newest = findNewestBackupFile(BACKUP_DIR)

  if (!newest) {
    const detail = `В ${BACKUP_DIR} нет ни одного файла maddy_*.tar.gz`
    let alerted = false
    if (!prevState.alerted) {
      await postDashboardAlert({
        type: 'BACKUP_FAILED',
        severity: 'ERROR',
        title: 'Бэкап Maddy: файлов не найдено',
        message: detail,
        metadata: { jobId: 'maddy-backup-freshness-check', backupDir: BACKUP_DIR },
      })
      alerted = true
    }
    saveState({ alerted: true })
    return {
      checkedAt,
      backupDir: BACKUP_DIR,
      newestFile: null,
      newestFileAgeHours: null,
      stale: true,
      alerted,
      error: detail,
    }
  }

  const ageHours = (Date.now() - newest.mtimeMs) / (1000 * 60 * 60)
  const stale = ageHours > MAX_AGE_HOURS

  let alerted = false
  if (stale && !prevState.alerted) {
    await postDashboardAlert({
      type: 'BACKUP_FAILED',
      severity: 'ERROR',
      title: `Бэкап Maddy устарел (${ageHours.toFixed(1)} ч)`,
      message: `Самый свежий файл — ${newest.name}, старше порога ${MAX_AGE_HOURS} ч. Проверить cron/SSH-ключ на mail-сервере (см. PLAN.md Этап 0.3, инцидент 2026-07-28).`,
      metadata: { jobId: 'maddy-backup-freshness-check', backupDir: BACKUP_DIR, newestFile: newest.name, ageHours },
    })
    alerted = true
  }

  saveState({ alerted: stale ? true : false })

  return {
    checkedAt,
    backupDir: BACKUP_DIR,
    newestFile: newest.name,
    newestFileAgeHours: ageHours,
    stale,
    alerted,
    error: null,
  }
}
