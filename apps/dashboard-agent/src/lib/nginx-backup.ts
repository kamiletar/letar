/**
 * Nginx Proxy Manager Backup
 * Создание бэкапов конфигурации NPM (SQLite + SSL сертификаты)
 *
 * Механика упаковки/ротации/списка — общая, вынесена в `tar-backup.ts` (2026-08-08).
 * Свой `archive` нужен только из-за `--exclude` (кэш IPFS-прокси и access-логи не бэкапим) —
 * общий модуль такого не умеет и не должен: это специфика именно NPM.
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import {
  type ArchiveOutcome,
  createTarBackup,
  listTarBackups,
  type TarBackupInfo,
  type TarBackupResult,
} from './tar-backup'

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/home/deploy/letar'

/** Путь к данным NPM на хосте (bind-mount из docker-compose) */
const NPM_DATA_DIR = path.join(WORKSPACE_PATH, 'infra/nginx-proxy-manager/data')

/** Путь к SSL сертификатам NPM */
const NPM_LETSENCRYPT_DIR = path.join(WORKSPACE_PATH, 'infra/nginx-proxy-manager/letsencrypt')

/** Директория для бэкапов */
const BACKUPS_DIR = path.join(WORKSPACE_PATH, 'backups')

const PREFIX = 'nginx'

export type NginxBackupResult = TarBackupResult
export type NginxBackupInfo = TarBackupInfo

/** Упаковка с исключением кэша IPFS-прокси и access-логов из NPM_DATA_DIR */
function runNginxTar(filepath: string, sourcePaths: string[]): Promise<ArchiveOutcome> {
  return new Promise((resolve) => {
    const tar = spawn('tar', [
      '-czf',
      filepath,
      '--exclude=*/nginx/ipfs-cache',
      '--exclude=*/nginx/proxy_host/*/access.log',
      ...sourcePaths,
    ])

    let stderr = ''
    tar.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    tar.on('error', (error: Error) => {
      resolve({ ok: false, stderr: error.message })
    })

    tar.on('close', (code: number | null) => {
      resolve(code === 0 ? { ok: true } : { ok: false, stderr: stderr || `tar exited with code ${code}` })
    })
  })
}

/** Создаёт бэкап NPM: архивирует data/ + letsencrypt/ в tar.gz */
export async function backupNginx(type: 'manual' | 'auto' = 'manual'): Promise<NginxBackupResult> {
  const sources = [{ label: 'данные NPM', path: NPM_DATA_DIR }]
  // letsencrypt опционален исторически — до первого выпуска сертификата каталога нет
  if (existsSync(NPM_LETSENCRYPT_DIR)) {
    sources.push({ label: 'сертификаты NPM', path: NPM_LETSENCRYPT_DIR })
  }

  return createTarBackup({
    prefix: PREFIX,
    type,
    backupsDir: BACKUPS_DIR,
    sources,
    archive: runNginxTar,
  })
}

/** Возвращает список бэкапов nginx (файлы nginx_*.tar.gz) */
export async function getNginxBackupsList(): Promise<NginxBackupInfo[]> {
  return listTarBackups(PREFIX, BACKUPS_DIR)
}
