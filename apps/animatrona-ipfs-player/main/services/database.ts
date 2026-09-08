/**
 * Database Service — применение Prisma миграций через sql.js (WASM)
 *
 * В production Prisma CLI недоступен (нет native-модулей в упакованном
 * приложении) — миграции применяются вручную через sql.js, тем же способом,
 * что и apps/animatrona (main/services/database.ts там же, полнее — с
 * обратной совместимостью legacy-версий БД, которой у нового приложения нет).
 */

import crypto from 'crypto'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { getDatabasePath } from '../utils/db'

declare const __non_webpack_require__: NodeRequire

const isProd = app.isPackaged || process.env.NODE_ENV === 'production'

interface MigrationFile {
  name: string
  sql: string
}

function getMigrationsDir(): string {
  if (isProd) {
    return path.join(process.resourcesPath, 'migrations')
  }
  return path.join(__dirname, '..', '..', 'prisma', 'migrations')
}

function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = getMigrationsDir()
  if (!fs.existsSync(migrationsDir)) {
    return []
  }

  const folders = fs
    .readdirSync(migrationsDir)
    .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
    .sort()

  return folders
    .map((folder) => {
      const sqlPath = path.join(migrationsDir, folder, 'migration.sql')
      if (!fs.existsSync(sqlPath)) {
        return { name: folder, sql: '' }
      }
      return { name: folder, sql: fs.readFileSync(sqlPath, 'utf-8') }
    })
    .filter((m) => m.sql.length > 0)
}

/** Разбивает SQL на отдельные команды, учитывая BEGIN...END блоки в триггерах */
function parseSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let depth = 0

  for (const line of sql.split('\n')) {
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

async function runMigrations(dbPath: string): Promise<void> {
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

  const SQL = await initSqlJs({ locateFile: (file: string) => wasmPath || file })

  const dbExists = fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0
  const db = dbExists ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database()

  try {
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

    const appliedResult = db.exec('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL')
    const appliedNames = new Set<string>(appliedResult[0]?.values.map((v: unknown[]) => v[0] as string) || [])

    const migrations = getMigrationFiles()
    if (migrations.length === 0) {
      db.close()
      return
    }

    let appliedCount = 0
    for (const migration of migrations) {
      if (appliedNames.has(migration.name)) {
        continue
      }

      const migrationId = crypto.randomUUID()
      db.run(
        `INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at) VALUES (?, '', ?, datetime('now'))`,
        [migrationId, migration.name],
      )

      let stepsApplied = 0
      for (const statement of parseSqlStatements(migration.sql)) {
        try {
          db.run(statement)
          stepsApplied++
        } catch (statementErr) {
          const errMsg = String(statementErr)
          const isIdempotent = errMsg.includes('duplicate column name')
            || errMsg.includes('already exists')
            || (errMsg.includes('table') && errMsg.includes('exists'))
          if (isIdempotent) {
            stepsApplied++
          } else {
            db.run(`UPDATE _prisma_migrations SET logs = ? WHERE id = ?`, [errMsg, migrationId])
            throw statementErr
          }
        }
      }

      db.run(`UPDATE _prisma_migrations SET finished_at = datetime('now'), applied_steps_count = ? WHERE id = ?`, [
        stepsApplied,
        migrationId,
      ])
      appliedCount++
    }

    const data = db.export()
    fs.writeFileSync(dbPath, Buffer.from(data))

    // sql.js export() создаёт целостный файл БД (как journal_mode=delete). Если другой процесс
    // уже открыл WAL-соединение, его WAL/SHM файлы ссылаются на старую структуру страниц —
    // удаляем их, чтобы соединения начинали с чистого файла.
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

/** Инициализация БД: создаёт файл при первом запуске, применяет новые миграции при обновлениях. */
export async function initializeDatabase(): Promise<void> {
  const dbPath = getDatabasePath()
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  await runMigrations(dbPath)
}
