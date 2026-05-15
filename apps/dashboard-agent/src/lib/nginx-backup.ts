/**
 * Nginx Proxy Manager Backup
 * Создание бэкапов конфигурации NPM (SQLite + SSL сертификаты)
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { readdir, stat, unlink } from 'fs/promises'
import path from 'path'

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/home/deploy/lena'

/** Путь к данным NPM на хосте (bind-mount из docker-compose) */
const NPM_DATA_DIR = path.join(WORKSPACE_PATH, 'infra/nginx-proxy-manager/data')

/** Путь к SSL сертификатам NPM */
const NPM_LETSENCRYPT_DIR = path.join(WORKSPACE_PATH, 'infra/nginx-proxy-manager/letsencrypt')

/** Директория для бэкапов */
const BACKUPS_DIR = path.join(WORKSPACE_PATH, 'backups')

export interface NginxBackupResult {
  success: boolean
  file?: string
  size?: number
  duration?: number
  error?: string
}

export interface NginxBackupInfo {
  id: string
  filename: string
  path: string
  size: number
  createdAt: string
  type: 'manual' | 'auto'
}

/**
 * Создаёт бэкап NPM: архивирует data/ + letsencrypt/ в tar.gz
 */
export async function backupNginx(type: 'manual' | 'auto' = 'manual'): Promise<NginxBackupResult> {
  const startTime = Date.now()
  const moscowTime = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Moscow' }).replace(/[: ]/g, '-')
  const filename = `nginx_${type}_${moscowTime}.tar.gz`
  const filepath = path.join(BACKUPS_DIR, filename)

  if (!existsSync(NPM_DATA_DIR)) {
    return {
      success: false,
      error: `NPM data dir not found: ${NPM_DATA_DIR}`,
    }
  }

  // Определяем что архивировать (пути захардкожены — безопасно для spawn)
  const dirsToArchive = [NPM_DATA_DIR]
  if (existsSync(NPM_LETSENCRYPT_DIR)) {
    dirsToArchive.push(NPM_LETSENCRYPT_DIR)
  }

  return new Promise((resolve) => {
    try {
      // Создаём директорию бэкапов
      const mkdir = spawn('mkdir', ['-p', BACKUPS_DIR])
      mkdir.on('close', () => {
        // tar -czf <output> --exclude кэшей и логов <dir1> [dir2]
        const tar = spawn('tar', [
          '-czf',
          filepath,
          '--exclude=*/nginx/ipfs-cache',
          '--exclude=*/nginx/proxy_host/*/access.log',
          ...dirsToArchive,
        ])

        let stderr = ''
        tar.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })

        tar.on('error', (error: Error) => {
          resolve({
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
          })
        })

        tar.on('close', async (code: number | null) => {
          const duration = Date.now() - startTime

          if (code !== 0) {
            // Удаляем неполный файл
            try {
              await unlink(filepath)
            } catch {
              /* ignore */
            }
            resolve({
              success: false,
              error: stderr || `tar exited with code ${code}`,
              duration,
            })
            return
          }

          try {
            const stats = await stat(filepath)
            console.warn(`[NginxBackup] Успешно создан бэкап: ${filename} (${stats.size} bytes)`)
            resolve({
              success: true,
              file: filename,
              size: stats.size,
              duration,
            })
          } catch {
            resolve({
              success: false,
              error: 'Failed to stat backup file',
              duration,
            })
          }
        })
      })
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      })
    }
  })
}

/**
 * Возвращает список бэкапов nginx (файлы nginx_*.tar.gz)
 */
export async function getNginxBackupsList(): Promise<NginxBackupInfo[]> {
  try {
    const files = await readdir(BACKUPS_DIR)
    const backups: NginxBackupInfo[] = []

    for (const filename of files) {
      if (!filename.startsWith('nginx_') || !filename.endsWith('.tar.gz')) {
        continue
      }

      // nginx_auto_2025-01-01T00-00-00.tar.gz → parts[1] = 'auto'
      const parts = filename.replace('.tar.gz', '').split('_')
      const type: 'manual' | 'auto' = parts[1] === 'auto' ? 'auto' : 'manual'
      const filePath = path.join(BACKUPS_DIR, filename)

      try {
        const stats = await stat(filePath)
        backups.push({
          id: filename,
          filename,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          type,
        })
      } catch {
        continue
      }
    }

    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}
