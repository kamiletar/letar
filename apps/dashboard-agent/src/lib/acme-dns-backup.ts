/**
 * Бэкап acme-dns (PLAN-INFRA.md §48).
 *
 * От acme-dns зависит продление **всех** сертификатов зоны `letar.best`. Если он тихо
 * умрёт, выяснится это через 90 дней в худший момент — поэтому бэкап тут не «на всякий
 * случай», а часть работоспособности TLS.
 *
 * Архивируются две вещи, и обе обязательны:
 *
 * - `infra/acme-dns/data/` — база выданных поддоменов;
 * - `/home/deploy/lego/acme-dns-accounts.json` — файл аккаунтов lego. **Восстановить его
 *   нельзя:** регистрация в acme-dns закрыта (`disable_registration = true`), а даже с
 *   открытой новый аккаунт дал бы новый `fulldomain`, то есть потребовал бы правки боевой
 *   `CNAME`-записи в зоне.
 *
 * Отсутствие любого из двух — ошибка, а не повод сделать бэкап из того, что нашлось:
 * молчаливо неполный архив опаснее отсутствующего, потому что выглядит как защита.
 *
 * ⚠️ Архив содержит секрет уровня прод-БД (кто владеет файлом аккаунтов — тот подменяет
 * ACME-челленджи всей зоны) и **не шифруется** — ровно как `nginx_*.tar.gz` (приватные ключи
 * всех сертификатов) и `maddy_*.tar.gz` (DKIM). Это осознанное следование существующей
 * политике, а не недосмотр: шифровать один бэкап из трёх — непоследовательно, а в момент
 * аварии добавляет зависимость от age-ключа. Вопрос «шифровать ли бэкапы на покое» — общий,
 * заведён отдельно в §48; решать его надо сразу для всех трёх, не точечно здесь.
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { chmod, readdir, stat, unlink } from 'fs/promises'
import path from 'path'

const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/home/deploy/letar'

/** База acme-dns — bind-mount из `infra/acme-dns/docker-compose.yml` */
const ACME_DNS_DATA_DIR = path.join(WORKSPACE_PATH, 'infra/acme-dns/data')

/**
 * Файл аккаунтов lego. Лежит ВНЕ workspace, поэтому в контейнер агента монтируется
 * отдельной строкой (`docker-compose.production.yml`). Забыть про монтирование — значит
 * получать «файл не найден» на каждом прогоне.
 */
const LEGO_ACCOUNTS_FILE = process.env.ACME_DNS_ACCOUNTS_FILE || '/home/deploy/lego/acme-dns-accounts.json'

/** Каталог бэкапов — отдельный, чтобы проверка свежести смотрела ровно на них */
const BACKUPS_DIR = path.join(WORKSPACE_PATH, 'backups/acme-dns')

/** Максимальное количество автоматических бэкапов */
const MAX_AUTO_BACKUPS = 14

export interface AcmeDnsBackupResult {
  success: boolean
  file?: string
  size?: number
  duration?: number
  error?: string
}

export interface AcmeDnsBackupInfo {
  id: string
  filename: string
  path: string
  size: number
  createdAt: string
  type: 'manual' | 'auto'
}

/**
 * Создаёт бэкап acme-dns: база + файл аккаунтов lego в один tar.gz.
 *
 * Снимок базы снимается обычным tar, без `sqlite3 .backup`. Это допустимо именно здесь:
 * acme-dns пишет в базу только при обновлении TXT-записи, то есть считанные разы в 90 дней,
 * и вероятность поймать момент записи ничтожна. Для БД приложений так делать нельзя.
 */
export async function backupAcmeDns(type: 'manual' | 'auto' = 'manual'): Promise<AcmeDnsBackupResult> {
  const startTime = Date.now()
  const moscowTime = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Moscow' }).replace(/[: ]/g, '-')
  const filename = `acme-dns_${type}_${moscowTime}.tar.gz`
  const filepath = path.join(BACKUPS_DIR, filename)

  // Оба источника обязательны — см. врезку в шапке файла
  const missing: string[] = []
  if (!existsSync(ACME_DNS_DATA_DIR)) {
    missing.push(`база acme-dns: ${ACME_DNS_DATA_DIR}`)
  }
  if (!existsSync(LEGO_ACCOUNTS_FILE)) {
    missing.push(
      `файл аккаунтов lego: ${LEGO_ACCOUNTS_FILE} `
        + '(проверить, смонтирован ли /home/deploy/lego в контейнер агента)',
    )
  }
  if (missing.length > 0) {
    return {
      success: false,
      error: `Нечего бэкапить, отсутствует — ${missing.join('; ')}`,
      duration: Date.now() - startTime,
    }
  }

  return new Promise((resolve) => {
    try {
      const mkdir = spawn('mkdir', ['-p', BACKUPS_DIR])
      mkdir.on('close', () => {
        // Пути захардкожены/из env — в spawn идут отдельными аргументами, без шелла
        const tar = spawn('tar', ['-czf', filepath, ACME_DNS_DATA_DIR, LEGO_ACCOUNTS_FILE])

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
            // Архив содержит учётные данные — читать его должен только владелец.
            // tar создаёт файл по umask, то есть по умолчанию читаемым для всех.
            await chmod(filepath, 0o600)
            const stats = await stat(filepath)
            console.warn(`[AcmeDnsBackup] Успешно создан бэкап: ${filename} (${stats.size} bytes)`)
            await rotateAcmeDnsBackups()
            resolve({
              success: true,
              file: filename,
              size: stats.size,
              duration,
            })
          } catch (error) {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to finalize backup file',
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

/** Ротация: оставляет последние MAX_AUTO_BACKUPS авто-бэкапов, ручные не трогает */
async function rotateAcmeDnsBackups(): Promise<void> {
  try {
    const files = await readdir(BACKUPS_DIR)
    const autoBackups = files
      .filter((f) => f.startsWith('acme-dns_auto_') && f.endsWith('.tar.gz'))
      .sort()
      .reverse()

    const toDelete = autoBackups.slice(MAX_AUTO_BACKUPS)
    for (const filename of toDelete) {
      try {
        await unlink(path.join(BACKUPS_DIR, filename))
        console.warn(`[AcmeDnsBackup] Удалён старый бэкап: ${filename}`)
      } catch {
        // Игнорируем ошибки удаления
      }
    }
  } catch {
    // Игнорируем ошибки ротации
  }
}

/** Возвращает список бэкапов acme-dns (файлы acme-dns_*.tar.gz) */
export async function getAcmeDnsBackupsList(): Promise<AcmeDnsBackupInfo[]> {
  try {
    const files = await readdir(BACKUPS_DIR)
    const backups: AcmeDnsBackupInfo[] = []

    for (const filename of files) {
      if (!filename.startsWith('acme-dns_') || !filename.endsWith('.tar.gz')) {
        continue
      }

      // acme-dns_auto_2026-08-07T03-00-00.tar.gz → parts[1] = 'auto'
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
