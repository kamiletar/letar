/**
 * Общий механизм tar-бэкапов агента.
 *
 * Вынесен 2026-08-08 при добавлении бэкапа секретов Traefik на s3 (PLAN-INFRA.md §48 M2).
 * К тому моменту в агенте уже лежали две почти идентичные реализации — `acme-dns-backup.ts` и
 * `nginx-backup.ts`, обе без тестов. Третья копия превратила бы совпадение в систему.
 *
 * ⚠️ Инвариант, ради которого этот код существует отдельно от «просто вызвать tar»:
 * **отсутствие любого из источников — ошибка, а не повод заархивировать то, что нашлось.**
 * Молчаливо неполный архив опаснее отсутствующего: он выглядит как защита и обнаруживается
 * ровно в момент восстановления, когда уже поздно.
 *
 * ⚠️ Архивы содержат секреты и **не шифруются** — осознанное следование существующей политике
 * (`nginx_*.tar.gz` хранит приватные ключи сертификатов, `maddy_*.tar.gz` — DKIM). Шифровать
 * один бэкап из четырёх непоследовательно, а в аварии добавляет зависимость от age-ключа.
 * Общий вопрос «шифровать ли бэкапы на покое» заведён в §48 и решается сразу для всех.
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { chmod, chown, mkdir, readdir, stat, unlink } from 'fs/promises'
import path from 'path'

/** Один источник для архива. `label`/`hint` идут в текст ошибки, если файла нет. */
export interface TarBackupSource {
  /** Человекочитаемое имя — попадёт в сообщение об ошибке */
  label: string
  /** Абсолютный путь к файлу или каталогу */
  path: string
  /** Подсказка «куда смотреть», если источник не найден (например: проверить монтирование) */
  hint?: string
}

export interface TarBackupOptions {
  /** Префикс имени файла: `<prefix>_<type>_<timestamp>.tar.gz` */
  prefix: string
  type: 'manual' | 'auto'
  sources: TarBackupSource[]
  backupsDir: string
  /** Сколько auto-бэкапов оставлять при ротации (manual не трогаются). По умолчанию 14 */
  maxAutoBackups?: number
  /**
   * Как именно упаковать источники. По умолчанию — системный `tar`.
   *
   * Шов существует не «ради тестируемости вообще», а потому что `tar` — внешняя платформенная
   * зависимость: на Windows он ведёт себя иначе и в тестовой среде подвешивает процесс. Вся
   * содержательная логика (проверка источников, права, ротация, список) от способа упаковки не
   * зависит и должна проверяться детерминированно. Настоящий `tar` прогоняется на сервере.
   */
  archive?: (filepath: string, sourcePaths: string[]) => Promise<ArchiveOutcome>
}

export interface ArchiveOutcome {
  ok: boolean
  /** Диагностика архиватора — попадёт в `error`, если `ok: false` */
  stderr?: string
}

export interface TarBackupResult {
  success: boolean
  file?: string
  size?: number
  duration?: number
  error?: string
}

export interface TarBackupInfo {
  id: string
  filename: string
  path: string
  size: number
  createdAt: string
  type: 'manual' | 'auto'
}

const DEFAULT_MAX_AUTO_BACKUPS = 14

export async function createTarBackup(options: TarBackupOptions): Promise<TarBackupResult> {
  const { prefix, type, sources, backupsDir } = options
  const maxAutoBackups = options.maxAutoBackups ?? DEFAULT_MAX_AUTO_BACKUPS

  const startTime = Date.now()
  const moscowTime = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Moscow' }).replace(/[: ]/g, '-')
  const filename = `${prefix}_${type}_${moscowTime}.tar.gz`
  const filepath = path.join(backupsDir, filename)

  // Все источники обязательны — см. врезку в шапке файла
  const missing = sources
    .filter((source) => !existsSync(source.path))
    .map((source) => `${source.label}: ${source.path}${source.hint ? ` (${source.hint})` : ''}`)

  if (missing.length > 0) {
    return {
      success: false,
      error: `Нечего бэкапить, отсутствует — ${missing.join('; ')}`,
      duration: Date.now() - startTime,
    }
  }

  // ⚠️ Каталог создаём через fs/promises, а НЕ `spawn('mkdir', …)`, как было в унаследованных
  // реализациях. Там ошибка запуска процесса не обрабатывалась вовсе — висел только
  // `mkdir.on('close')`, поэтому при `ENOENT` промис не резолвился НИКОГДА: бэкап не падал,
  // а молча зависал, и вызывающий cron ждал бы до собственного таймаута. На Linux `mkdir`
  // всегда есть, поэтому дефект не проявлялся; поймано тестом на Windows (2026-08-08).
  try {
    await mkdir(backupsDir, { recursive: true })
  } catch (error) {
    return {
      success: false,
      error: `Не удалось создать каталог бэкапов ${backupsDir}: ${error instanceof Error ? error.message : 'unknown'}`,
      duration: Date.now() - startTime,
    }
  }

  const archive = options.archive ?? runSystemTar
  const outcome = await archive(filepath, sources.map((source) => source.path))

  if (!outcome.ok) {
    try {
      await unlink(filepath)
    } catch {
      /* ignore */
    }
    return {
      success: false,
      error: outcome.stderr || 'Архиватор завершился с ошибкой',
      duration: Date.now() - startTime,
    }
  }

  try {
    // Архив содержит секреты — читать его может владелец (root, процесс агента) и группа
    // каталога `backups/`. Без группы: контейнер пишет файл как root:root/600, а Resilio Sync
    // на хосте работает под непривилегированным `deploy` — не root и не в группе `root`, поэтому
    // физически не может прочитать файл и молча не доставляет его в оффсайт-копии (обнаружено
    // 2026-08-19: `nginx_auto_*`/`acme-dns_auto_*` никогда не уезжали за пределы сервера).
    // Группу берём с самого каталога бэкапов, а не хардкодим gid — на хосте это `deploy:deploy`,
    // но так фикс не завязан на конкретное числовое значение.
    const dirStats = await stat(backupsDir)
    await chmod(filepath, 0o640)
    await chown(filepath, -1, dirStats.gid)
    const stats = await stat(filepath)
    console.warn(`[TarBackup:${prefix}] Успешно создан бэкап: ${filename} (${stats.size} bytes)`)
    await rotateTarBackups(prefix, backupsDir, maxAutoBackups)
    return { success: true, file: filename, size: stats.size, duration: Date.now() - startTime }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to finalize backup file',
      duration: Date.now() - startTime,
    }
  }
}

/** Упаковка системным `tar`. Пути идут отдельными аргументами spawn — без шелла. */
function runSystemTar(filepath: string, sourcePaths: string[]): Promise<ArchiveOutcome> {
  return new Promise((resolve) => {
    const tar = spawn('tar', ['-czf', filepath, ...sourcePaths])

    let stderr = ''
    tar.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    // Без этого обработчика `ENOENT` (нет tar в PATH) не резолвил бы промис вовсе
    tar.on('error', (error: Error) => {
      resolve({ ok: false, stderr: error.message })
    })

    tar.on('close', (code: number | null) => {
      resolve(code === 0 ? { ok: true } : { ok: false, stderr: stderr || `tar exited with code ${code}` })
    })
  })
}

/** Ротация: оставляет последние `maxAutoBackups` авто-бэкапов, ручные не трогает */
async function rotateTarBackups(prefix: string, backupsDir: string, maxAutoBackups: number): Promise<void> {
  try {
    const files = await readdir(backupsDir)
    const autoBackups = files
      .filter((f) => f.startsWith(`${prefix}_auto_`) && f.endsWith('.tar.gz'))
      .sort()
      .reverse()

    for (const filename of autoBackups.slice(maxAutoBackups)) {
      try {
        await unlink(path.join(backupsDir, filename))
        console.warn(`[TarBackup:${prefix}] Удалён старый бэкап: ${filename}`)
      } catch {
        // Игнорируем ошибки удаления
      }
    }
  } catch {
    // Игнорируем ошибки ротации
  }
}

/** Список бэкапов с заданным префиксом. Чужие префиксы в каталоге игнорируются. */
export async function listTarBackups(prefix: string, backupsDir: string): Promise<TarBackupInfo[]> {
  try {
    const files = await readdir(backupsDir)
    const backups: TarBackupInfo[] = []

    for (const filename of files) {
      if (!filename.startsWith(`${prefix}_`) || !filename.endsWith('.tar.gz')) {
        continue
      }

      // <prefix>_auto_2026-08-07T03-00-00.tar.gz → parts[1] = 'auto'
      const parts = filename.replace('.tar.gz', '').split('_')
      const type: 'manual' | 'auto' = parts[1] === 'auto' ? 'auto' : 'manual'
      const filePath = path.join(backupsDir, filename)

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
