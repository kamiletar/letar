/**
 * Database Service — управление SQLite БД и Prisma миграциями
 *
 * Архитектура:
 * - В production: используется sql.js (WASM) для применения миграций
 * - В development: миграции применяются напрямую
 * - Обратная совместимость: user_version >= 5 → baseline помечается как применённая
 */

import crypto from 'crypto'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('Database')

// Объявляем __non_webpack_require__ для обхода Webpack bundling
declare const __non_webpack_require__: NodeRequire

/** Имя baseline миграции — создаётся при первом запуске новой системы миграций */
const _BASELINE_MIGRATION_NAME = '0_baseline'

/** Минимальная версия user_version для обратной совместимости */
const LEGACY_DB_VERSION_FOR_BASELINE = 5

/** Проверка production режима */
const isProd = app.isPackaged || process.env.NODE_ENV === 'production'

/** Структура файла миграции Prisma */
interface MigrationFile {
  /** Имя папки миграции (timestamp_name) */
  name: string
  /** Содержимое migration.sql */
  sql: string
}

/**
 * Получить путь к базе данных SQLite
 * В production: %APPDATA%/Animatrona/data/app.db
 * В development: apps/animatrona/prisma/data/app.db
 */
export function getDatabasePath(): string {
  if (isProd) {
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'data')
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    return path.join(dbDir, 'app.db')
  }
  return path.join(__dirname, '..', '..', 'prisma', 'data', 'app.db')
}

/**
 * Получить DATABASE_URL для Prisma
 */
export function getDatabaseUrl(): string {
  const dbPath = getDatabasePath()
  return `file:${dbPath}`
}

/**
 * Получить путь к папке с миграциями
 */
function getMigrationsDir(): string {
  if (isProd) {
    return path.join(process.resourcesPath, 'migrations')
  }
  return path.join(__dirname, '..', '..', 'prisma', 'migrations')
}

/**
 * Получить список миграций из папки prisma/migrations/
 * Миграции сортируются по имени (timestamp в начале имени)
 */
function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = getMigrationsDir()

  if (!fs.existsSync(migrationsDir)) {
    log.warn('Migrations directory not found', { path: migrationsDir })
    return []
  }

  const folders = fs
    .readdirSync(migrationsDir)
    .filter((f) => {
      const fullPath = path.join(migrationsDir, f)
      return fs.statSync(fullPath).isDirectory()
    })
    .sort()

  return folders
    .map((folder) => {
      const sqlPath = path.join(migrationsDir, folder, 'migration.sql')
      if (!fs.existsSync(sqlPath)) {
        log.warn('migration.sql not found in folder', { folder })
        return { name: folder, sql: '' }
      }
      return {
        name: folder,
        sql: fs.readFileSync(sqlPath, 'utf-8'),
      }
    })
    .filter((m) => m.sql.length > 0)
}

/**
 * Разбивает SQL на отдельные команды, учитывая BEGIN...END блоки в триггерах
 */
function parseSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let depth = 0

  const lines = sql.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (!trimmedLine || trimmedLine.startsWith('--')) {
      continue
    }

    if (/\bBEGIN\b/i.test(trimmedLine)) {
      depth++
    }

    if (/\bEND\s*;?\s*$/i.test(trimmedLine)) {
      depth = Math.max(0, depth - 1)
    }

    current += line + '\n'

    if (depth === 0 && trimmedLine.endsWith(';')) {
      const statement = current.trim()
      if (statement && !statement.startsWith('--')) {
        statements.push(statement.replace(/;\s*$/, ''))
      }
      current = ''
    }
  }

  const remaining = current.trim()
  if (remaining && !remaining.startsWith('--')) {
    statements.push(remaining.replace(/;\s*$/, ''))
  }

  return statements
}

/**
 * Применяет Prisma миграции к БД
 * Если файла нет — создаёт пустую БД и применяет все миграции с нуля.
 * Использует sql.js (WASM) — без native модулей.
 */
async function applyPrismaMigrations(dbPath: string): Promise<void> {
  const sqlJsPath = isProd
    ? path.join(process.resourcesPath, 'node_modules', 'fts5-sql-bundle')
    : path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'fts5-sql-bundle')

  const initSqlJs = __non_webpack_require__(sqlJsPath).default

  const wasmPath = isProd
    ? path.join(process.resourcesPath, 'sql-wasm.wasm')
    : path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'fts5-sql-bundle', 'dist', 'sql-wasm.wasm')

  if (!fs.existsSync(wasmPath)) {
    throw new Error(`sql-wasm.wasm not found at ${wasmPath}`)
  }

  const SQL = await initSqlJs({
    locateFile: (file: string) => wasmPath || file,
  })

  // Если файл существует — загружаем, иначе создаём пустую БД
  const dbExists = fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0
  const db = dbExists ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database()

  try {
    // Создаём таблицу _prisma_migrations если не существует
    db.run(`
      CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id TEXT PRIMARY KEY NOT NULL,
        checksum TEXT NOT NULL,
        finished_at DATETIME,
        migration_name TEXT NOT NULL UNIQUE,
        logs TEXT,
        rolled_back_at DATETIME,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      )
    `)

    // Проверяем legacy систему (user_version)
    const versionResult = db.exec('PRAGMA user_version')
    const userVersion = (versionResult[0]?.values[0]?.[0] as number) || 0

    // Проверяем есть ли уже записи в _prisma_migrations
    const migrationsCount = db.exec('SELECT COUNT(*) FROM _prisma_migrations')
    const hasAnyMigrations = ((migrationsCount[0]?.values[0]?.[0] as number) || 0) > 0

    // Обратная совместимость: если user_version >= 5 и нет записей — помечаем только INIT миграцию как применённую
    // (legacy БД уже содержит базовую схему из init миграции; новые миграции должны выполниться реально)
    if (userVersion >= LEGACY_DB_VERSION_FOR_BASELINE && !hasAnyMigrations) {
      log.info('Legacy database detected, marking init migration as applied', { userVersion })

      const allMigrations = getMigrationFiles()
      // Помечаем только первую (init) миграцию — она уже применена в legacy БД
      const initMigration = allMigrations[0]
      if (initMigration) {
        const migrationId = crypto.randomUUID()
        db.run(
          `
          INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
          VALUES (?, '', ?, datetime('now'), datetime('now'), 0)
        `,
          [migrationId, initMigration.name]
        )
        log.info('Marked init migration as applied (legacy baseline)', { migration: initMigration.name })
      }
    }

    // Получаем уже применённые миграции
    const appliedResult = db.exec('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL')
    const appliedNames = new Set<string>(appliedResult[0]?.values.map((v: unknown[]) => v[0] as string) || [])

    // Получаем все доступные миграции
    const migrations = getMigrationFiles()

    if (migrations.length === 0) {
      log.info('No migrations to apply')
      db.close()
      return
    }

    // Применяем новые миграции
    let appliedCount = 0
    for (const migration of migrations) {
      if (appliedNames.has(migration.name)) {
        continue
      }

      log.info('Applying migration', { name: migration.name })

      // Перед удалением поля Anime.manifestCid — сохраняем legacy-аниме для авто-миграции после старта IPFS
      if (migration.name.includes('remove_anime_manifest_cid')) {
        try {
          const legacyResult = db.exec(
            'SELECT id, manifestCid FROM Anime WHERE manifestCid IS NOT NULL AND directoryCid IS NULL'
          )
          const values = legacyResult[0]?.values ?? []
          if (values.length > 0) {
            const legacyList = values.map((row: unknown[]) => ({
              id: row[0] as string,
              manifestCid: row[1] as string,
            }))
            const legacyFilePath = `${dbPath}.legacy-dirs.json`
            fs.writeFileSync(legacyFilePath, JSON.stringify(legacyList, null, 2))
            log.warn(`Сохранено ${legacyList.length} legacy-аниме для авто-миграции`, {
              legacyFilePath,
            })
          }
        } catch (err) {
          log.warn('Не удалось извлечь legacy-аниме перед миграцией', { error: String(err) })
        }
      }

      // Backup перед миграцией
      const backupPath = `${dbPath}.backup.${migration.name}`
      try {
        fs.copyFileSync(dbPath, backupPath)
      } catch {
        log.warn('Failed to create backup', { backupPath })
      }

      // Записываем начало миграции
      const migrationId = crypto.randomUUID()
      db.run(
        `
        INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at)
        VALUES (?, '', ?, datetime('now'))
      `,
        [migrationId, migration.name]
      )

      // Разбиваем SQL на отдельные команды
      const sqlCommands = parseSqlStatements(migration.sql)

      let stepsApplied = 0
      for (const cmd of sqlCommands) {
        try {
          db.run(cmd)
          stepsApplied++
        } catch (cmdErr) {
          const errMsg = String(cmdErr)
          // Ідемпотентні помилки: колонка/таблиця вже існують (legacy БД вже має частину схеми)
          const isIdempotent =
            errMsg.includes('duplicate column name') ||
            errMsg.includes('already exists') ||
            (errMsg.includes('table') && errMsg.includes('exists'))
          if (isIdempotent) {
            log.warn('Migration command skipped (already applied)', { migration: migration.name, error: errMsg })
            stepsApplied++
          } else {
            log.error('Migration command failed', { migration: migration.name, error: errMsg })
            db.run(`UPDATE _prisma_migrations SET logs = ? WHERE id = ?`, [errMsg, migrationId])
            throw cmdErr
          }
        }
      }

      // Записываем успешное завершение
      db.run(
        `
        UPDATE _prisma_migrations
        SET finished_at = datetime('now'), applied_steps_count = ?
        WHERE id = ?
      `,
        [stepsApplied, migrationId]
      )

      log.info('Migration applied successfully', { name: migration.name, steps: stepsApplied })
      appliedCount++
    }

    if (appliedCount > 0) {
      log.info('Migrations applied', { count: appliedCount })
    }

    // Сохраняем изменения
    const data = db.export()
    fs.writeFileSync(dbPath, Buffer.from(data))

    // sql.js export() создаёт целостный файл БД (как journal_mode=delete).
    // Если другой процесс уже открыл WAL-соединение, его WAL/SHM файлы
    // ссылаются на старую структуру страниц → SQLITE_CORRUPT.
    // Удаляем их чтобы все соединения начали с чистого файла.
    if (appliedCount > 0) {
      for (const suffix of ['-wal', '-shm']) {
        try {
          fs.unlinkSync(dbPath + suffix)
        } catch {
          // Файлы могут не существовать — это нормально
        }
      }
    }
  } finally {
    db.close()
  }
}

/**
 * Восстановить аудиодорожки и субтитры из бэкапа, сделанного до миграции dedup_tracks.
 *
 * Миграция 20260325120000_dedup_tracks ошибочно удалила разные озвучки одного эпизода,
 * приняв их за дубликаты по (episodeId, streamIndex). Восстанавливаем из бэкапа.
 */
async function restoreTracksFromDedup(dbPath: string): Promise<void> {
  const backupPath = `${dbPath}.backup.20260325120000_dedup_tracks`
  const markerPath = `${dbPath}.tracks_restored`

  if (!fs.existsSync(backupPath)) {
    log.debug('Бэкап dedup_tracks не найден, пропускаем восстановление', { backupPath })
    return
  }

  if (fs.existsSync(markerPath)) {
    log.debug('Дорожки уже восстановлены (маркер существует)')
    return
  }

  log.info('Восстановление дорожек из бэкапа dedup_tracks', { backupPath })

  const sqlJsPath = isProd
    ? path.join(process.resourcesPath, 'node_modules', 'fts5-sql-bundle')
    : path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'fts5-sql-bundle')

  const initSqlJs = __non_webpack_require__(sqlJsPath).default

  const wasmPath = isProd
    ? path.join(process.resourcesPath, 'sql-wasm.wasm')
    : path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'fts5-sql-bundle', 'dist', 'sql-wasm.wasm')

  const SQL = await initSqlJs({
    locateFile: (file: string) => wasmPath || file,
  })

  const backupDb = new SQL.Database(fs.readFileSync(backupPath))
  const currentDb = new SQL.Database(fs.readFileSync(dbPath))

  try {
    // --- AudioTrack ---
    const backupAudioRows = backupDb.exec(`
      SELECT id, episodeId, streamIndex, language, title, dubGroup,
             codec, channels, bitrate, isDefault, transcodedCid, ipfsSize, createdAt, updatedAt
      FROM AudioTrack
    `)

    let audioRestored = 0
    if (backupAudioRows.length > 0) {
      const cols = backupAudioRows[0].columns
      for (const row of backupAudioRows[0].values) {
        const get = (name: string) => row[cols.indexOf(name)]
        const id = get('id') as string

        // Проверяем нет ли уже в текущей БД
        const exists = currentDb.exec(`SELECT 1 FROM AudioTrack WHERE id = ?`, [id])
        if (exists.length > 0 && exists[0].values.length > 0) {
          continue
        }

        // Проверяем что episodeId существует в текущей БД
        const epExists = currentDb.exec(`SELECT 1 FROM Episode WHERE id = ?`, [get('episodeId') as string])
        if (epExists.length === 0 || epExists[0].values.length === 0) {
          continue
        }

        currentDb.run(
          `INSERT INTO AudioTrack (id, episodeId, streamIndex, language, title, dubGroup,
            codec, channels, bitrate, isDefault, transcodedCid, ipfsSize, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            get('episodeId'),
            get('streamIndex'),
            get('language'),
            get('title'),
            get('dubGroup'),
            get('codec'),
            get('channels'),
            get('bitrate'),
            get('isDefault') ? 1 : 0,
            get('transcodedCid'),
            get('ipfsSize'),
            get('createdAt'),
            get('updatedAt'),
          ]
        )
        audioRestored++
      }
    }

    // --- SubtitleTrack ---
    const backupSubRows = backupDb.exec(`
      SELECT id, episodeId, streamIndex, language, title, dubGroup, subtitleType,
             format, fileCid, ipfsSize, isDefault, createdAt
      FROM SubtitleTrack
    `)

    let subsRestored = 0
    if (backupSubRows.length > 0) {
      const cols = backupSubRows[0].columns
      for (const row of backupSubRows[0].values) {
        const get = (name: string) => row[cols.indexOf(name)]
        const id = get('id') as string

        const exists = currentDb.exec(`SELECT 1 FROM SubtitleTrack WHERE id = ?`, [id])
        if (exists.length > 0 && exists[0].values.length > 0) {
          continue
        }

        const epExists = currentDb.exec(`SELECT 1 FROM Episode WHERE id = ?`, [get('episodeId') as string])
        if (epExists.length === 0 || epExists[0].values.length === 0) {
          continue
        }

        currentDb.run(
          `INSERT INTO SubtitleTrack (id, episodeId, streamIndex, language, title, dubGroup,
            subtitleType, format, fileCid, ipfsSize, isDefault, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            get('episodeId'),
            get('streamIndex'),
            get('language'),
            get('title'),
            get('dubGroup'),
            get('subtitleType'),
            get('format'),
            get('fileCid'),
            get('ipfsSize'),
            get('isDefault') ? 1 : 0,
            get('createdAt'),
          ]
        )
        subsRestored++
      }
    }

    // --- SubtitleFont (для восстановленных субтитров) ---
    const backupFontRows = backupDb.exec(`
      SELECT id, subtitleTrackId, fontName, fileExt, fileCid, ipfsSize
      FROM SubtitleFont
    `)

    let fontsRestored = 0
    if (backupFontRows.length > 0) {
      const cols = backupFontRows[0].columns
      for (const row of backupFontRows[0].values) {
        const get = (name: string) => row[cols.indexOf(name)]
        const id = get('id') as string

        const exists = currentDb.exec(`SELECT 1 FROM SubtitleFont WHERE id = ?`, [id])
        if (exists.length > 0 && exists[0].values.length > 0) {
          continue
        }

        // Проверяем что subtitleTrack существует
        const stExists = currentDb.exec(`SELECT 1 FROM SubtitleTrack WHERE id = ?`, [get('subtitleTrackId') as string])
        if (stExists.length === 0 || stExists[0].values.length === 0) {
          continue
        }

        currentDb.run(
          `INSERT INTO SubtitleFont (id, subtitleTrackId, fontName, fileExt, fileCid, ipfsSize)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, get('subtitleTrackId'), get('fontName'), get('fileExt'), get('fileCid'), get('ipfsSize')]
        )
        fontsRestored++
      }
    }

    // --- Дедупликация: удаляем настоящие дубли по (episodeId, transcodedCid) ---
    // Оставляем одну запись на каждый уникальный CID в эпизоде
    const audioDupes = currentDb.exec(`
      DELETE FROM AudioTrack WHERE id NOT IN (
        SELECT MIN(id) FROM AudioTrack
        WHERE transcodedCid IS NOT NULL
        GROUP BY episodeId, transcodedCid
      ) AND transcodedCid IS NOT NULL
    `)
    void audioDupes

    // Для аудио без CID — дедупликация по (episodeId, streamIndex, dubGroup)
    currentDb.run(`
      DELETE FROM AudioTrack WHERE id NOT IN (
        SELECT MIN(id) FROM AudioTrack
        WHERE transcodedCid IS NULL
        GROUP BY episodeId, streamIndex, COALESCE(dubGroup, '')
      ) AND transcodedCid IS NULL
    `)

    // SubtitleTrack: дедупликация по (episodeId, fileCid)
    currentDb.run(`
      DELETE FROM SubtitleTrack WHERE id NOT IN (
        SELECT MIN(id) FROM SubtitleTrack
        WHERE fileCid IS NOT NULL
        GROUP BY episodeId, fileCid
      ) AND fileCid IS NOT NULL
    `)

    // Субтитры без CID — по (episodeId, streamIndex, dubGroup)
    currentDb.run(`
      DELETE FROM SubtitleTrack WHERE id NOT IN (
        SELECT MIN(id) FROM SubtitleTrack
        WHERE fileCid IS NULL
        GROUP BY episodeId, streamIndex, COALESCE(dubGroup, '')
      ) AND fileCid IS NULL
    `)

    // Осиротевшие шрифты (subtitleTrack удалён)
    currentDb.run(`
      DELETE FROM SubtitleFont WHERE subtitleTrackId NOT IN (
        SELECT id FROM SubtitleTrack
      )
    `)

    // Считаем итоги после дедупа
    const audioCount = currentDb.exec(`SELECT COUNT(*) FROM AudioTrack`)
    const subsCount = currentDb.exec(`SELECT COUNT(*) FROM SubtitleTrack`)
    log.info('После дедупликации', {
      audioTracks: audioCount[0]?.values[0]?.[0],
      subtitleTracks: subsCount[0]?.values[0]?.[0],
    })

    // Сохраняем текущую БД
    const data = currentDb.export()
    fs.writeFileSync(dbPath, Buffer.from(data))

    // Удаляем WAL/SHM для чистого старта
    for (const suffix of ['-wal', '-shm']) {
      try {
        fs.unlinkSync(dbPath + suffix)
      } catch {
        // Файлы могут не существовать
      }
    }

    // Маркер чтобы не восстанавливать повторно
    fs.writeFileSync(markerPath, new Date().toISOString())

    log.info('Дорожки восстановлены из бэкапа', { audioRestored, subsRestored, fontsRestored })
  } catch (error) {
    log.error('Ошибка восстановления дорожек из бэкапа', {
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    backupDb.close()
    currentDb.close()
  }
}

/**
 * Инициализация базы данных
 * При первом запуске создаёт пустую БД и применяет все миграции.
 * При обновлениях — применяет только новые миграции.
 */
export async function initializeDatabase(): Promise<void> {
  const dbPath = getDatabasePath()

  try {
    await applyPrismaMigrations(dbPath)
  } catch (err) {
    log.error('Migration error', { error: String(err) })
  }

  // Одноразовое восстановление дорожек после ошибочной дедупликации
  try {
    await restoreTracksFromDedup(dbPath)
  } catch (err) {
    log.error('Track restore error', { error: String(err) })
  }
}

/**
 * Миграция данных из старого пути @letar/animatrona в новый Animatrona
 */
export function migrateFromOldPath(): void {
  if (!isProd) {
    return
  }

  const appData = path.dirname(app.getPath('userData'))
  const oldPath = path.join(appData, '@lena', 'animatrona')
  const newPath = app.getPath('userData')

  if (!fs.existsSync(oldPath)) {
    return
  }

  const newDataDir = path.join(newPath, 'data')
  const newDbPath = path.join(newDataDir, 'app.db')

  if (fs.existsSync(newDbPath)) {
    return
  }

  try {
    // Копируем папку data (база данных)
    const oldDataDir = path.join(oldPath, 'data')
    if (fs.existsSync(oldDataDir)) {
      fs.mkdirSync(newDataDir, { recursive: true })
      const files = fs.readdirSync(oldDataDir)
      for (const file of files) {
        const srcFile = path.join(oldDataDir, file)
        const destFile = path.join(newDataDir, file)
        fs.copyFileSync(srcFile, destFile)
      }
    }

    // Копируем папку posters (постеры аниме)
    const oldPostersDir = path.join(oldPath, 'posters')
    const newPostersDir = path.join(newPath, 'posters')
    if (fs.existsSync(oldPostersDir) && !fs.existsSync(newPostersDir)) {
      fs.mkdirSync(newPostersDir, { recursive: true })
      const posters = fs.readdirSync(oldPostersDir)
      for (const poster of posters) {
        const srcFile = path.join(oldPostersDir, poster)
        const destFile = path.join(newPostersDir, poster)
        fs.copyFileSync(srcFile, destFile)
      }
    }
  } catch {
    // Продолжаем работу — будет использована свежая БД
  }
}

/**
 * Получить Prisma Client singleton
 * Реэкспорт из utils/db.ts для удобства импорта
 */
export { getPrismaClient as getDb, prisma } from '../utils/db'
