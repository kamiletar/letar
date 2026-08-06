/**
 * Database Service — управление SQLite БД и Prisma миграциями
 *
 * Архитектура:
 * - В production: используется sql.js (asm.js) для применения миграций
 * - В development: миграции применяются напрямую
 * - При первом запуске копирует template.db из resources
 * - При обновлениях применяет Prisma миграции
 */

import { Logger } from '@letar/label-printer-core'
import crypto from 'crypto'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

// Объявляем __non_webpack_require__ для обхода Webpack bundling
declare const __non_webpack_require__: NodeRequire

const getLogger = () => Logger.getInstance()

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
 * В production: %APPDATA%/label-printer-desktop/data/app.db
 * В development: apps/label-printer-desktop/prisma/data/app.db
 */
export function getDatabasePath(): string {
  if (isProd) {
    const dbDir = path.join(app.getPath('userData'), 'data')
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    return path.join(dbDir, 'app.db')
  }
  return path.join(__dirname, '..', '..', 'prisma', 'data', 'app.db')
}

/**
 * Получить путь к папке с миграциями
 */
function getMigrationsDir(): string {
  if (isProd) {
    return path.join(process.resourcesPath, 'migrations')
  }
  return path.join(__dirname, '..', '..', 'src', 'generated', 'migrations')
}

/**
 * Получить список миграций из папки migrations/
 * Миграции сортируются по имени (timestamp в начале имени)
 */
function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = getMigrationsDir()

  if (!fs.existsSync(migrationsDir)) {
    getLogger().warn('[Database] Migrations directory not found', { path: migrationsDir })
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
        getLogger().warn('[Database] migration.sql not found', { folder })
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
 * Применяет Prisma миграции к существующей БД
 * Использует sql.js (asm.js) — без native модулей
 */
async function applyPrismaMigrations(dbPath: string): Promise<void> {
  // sql.js/dist/sql-asm.js — asm.js версия, без WASM
  const sqlJsModulePath = isProd
    ? path.join(process.resourcesPath, 'node_modules', 'sql.js', 'dist', 'sql-asm.js')
    : path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-asm.js')

  if (!fs.existsSync(sqlJsModulePath)) {
    getLogger().error('[Database] sql-asm.js not found', { path: sqlJsModulePath })
    return
  }

  const initSqlJs = __non_webpack_require__(sqlJsModulePath)

  const SQL = await initSqlJs()

  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

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

    // Проверяем есть ли уже записи в _prisma_migrations
    const migrationsCount = db.exec('SELECT COUNT(*) FROM _prisma_migrations')
    const hasAnyMigrations = ((migrationsCount[0]?.values[0]?.[0] as number) || 0) > 0

    // Обратная совместимость: если таблицы уже существуют (от db:push) но нет записей о миграциях —
    // помечаем только INIT миграцию как применённую (baseline), чтобы ALTER TABLE миграции применились
    if (!hasAnyMigrations) {
      const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='Settings'")
      const hasSettingsTable = (tablesResult[0]?.values.length || 0) > 0

      if (hasSettingsTable) {
        getLogger().info('[Database] Legacy database detected (tables exist, no migrations), marking init as baseline')

        const allMigrations = getMigrationFiles()
        // Помечаем только init миграцию (первую — создание таблиц)
        const initMigration = allMigrations.find((m) => m.name.includes('_init'))
        if (initMigration) {
          const migrationId = crypto.randomUUID()
          db.run(
            `
            INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
            VALUES (?, '', ?, datetime('now'), datetime('now'), 0)
          `,
            [migrationId, initMigration.name],
          )
          getLogger().info('[Database] Marked init migration as applied (legacy baseline)', {
            migration: initMigration.name,
          })
        }

        // Сохраняем текущее состояние и продолжаем (НЕ возвращаемся — ALTER TABLE миграции нужно применить)
        const data = db.export()
        fs.writeFileSync(dbPath, Buffer.from(data))
      }
    }

    // Получаем уже применённые миграции
    const appliedResult = db.exec('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL')
    const appliedNames = new Set<string>(appliedResult[0]?.values.map((v: unknown[]) => v[0] as string) || [])

    // Получаем все доступные миграции
    const migrations = getMigrationFiles()

    if (migrations.length === 0) {
      getLogger().info('[Database] No migrations found')
      db.close()
      return
    }

    // Применяем новые миграции
    let appliedCount = 0
    for (const migration of migrations) {
      if (appliedNames.has(migration.name)) {
        continue
      }

      getLogger().info('[Database] Applying migration', { name: migration.name })

      // Backup перед миграцией
      const backupPath = `${dbPath}.backup.${migration.name}`
      try {
        fs.copyFileSync(dbPath, backupPath)
      } catch {
        getLogger().warn('[Database] Failed to create backup', { backupPath })
      }

      // Записываем начало миграции
      const migrationId = crypto.randomUUID()
      db.run(
        `
        INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at)
        VALUES (?, '', ?, datetime('now'))
      `,
        [migrationId, migration.name],
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
          // Безопасные ошибки для ALTER TABLE — колонка уже существует
          const isSafeError = errMsg.includes('duplicate column name') || errMsg.includes('already exists')
          if (isSafeError) {
            getLogger().info('[Database] Migration command skipped (already applied)', {
              migration: migration.name,
              reason: errMsg,
            })
            stepsApplied++
            continue
          }
          getLogger().error('[Database] Migration command failed', { migration: migration.name, error: errMsg })
          db.run(`UPDATE _prisma_migrations SET logs = ? WHERE id = ?`, [String(cmdErr), migrationId])
          throw cmdErr
        }
      }

      // Записываем успешное завершение
      db.run(
        `
        UPDATE _prisma_migrations
        SET finished_at = datetime('now'), applied_steps_count = ?
        WHERE id = ?
      `,
        [stepsApplied, migrationId],
      )

      getLogger().info('[Database] Migration applied', { name: migration.name, steps: stepsApplied })
      appliedCount++
    }

    if (appliedCount > 0) {
      getLogger().info('[Database] All migrations applied', { count: appliedCount })
    } else {
      getLogger().info('[Database] No new migrations to apply')
    }

    // Сохраняем изменения
    const data = db.export()
    fs.writeFileSync(dbPath, Buffer.from(data))
  } finally {
    db.close()
  }
}

/**
 * Инициализация базы данных
 * При первом запуске копирует template.db из resources
 * При обновлениях применяет Prisma миграции
 */
export async function initializeDatabase(): Promise<void> {
  const dbPath = getDatabasePath()
  getLogger().info('[Database] Using database file', { path: dbPath, isProd })

  // В dev режиме только применяем миграции, не копируем template
  if (!isProd) {
    try {
      await applyPrismaMigrations(dbPath)
    } catch (err) {
      getLogger().error('[Database] Migration error in dev mode', { error: String(err) })
    }
    return
  }

  const templatePath = path.join(process.resourcesPath, 'template.db')

  // Первый запуск или пустая БД — копируем template
  const dbExists = fs.existsSync(dbPath)
  const dbSize = dbExists ? fs.statSync(dbPath).size : 0

  if (!dbExists || dbSize === 0) {
    if (!fs.existsSync(templatePath)) {
      getLogger().error('[Database] Template database not found', { path: templatePath })
      return
    }

    try {
      fs.copyFileSync(templatePath, dbPath)
      getLogger().info('[Database] Template database copied', { path: dbPath })
    } catch (err) {
      getLogger().error('[Database] Failed to copy template database', { error: String(err) })
      return
    }
  }

  // Применяем Prisma миграции (для обновлений приложения)
  try {
    await applyPrismaMigrations(dbPath)
  } catch (err) {
    getLogger().error('[Database] Migration error', { error: String(err) })
  }
}
