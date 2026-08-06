#!/usr/bin/env tsx
/**
 * Обновление template.db через prisma db push
 *
 * v0.28.9: После удаления FTS5 можно использовать db push вместо migrate reset.
 * Prisma больше не пытается удалить виртуальные таблицы, т.к. их нет.
 *
 * ВАЖНО: db push не создаёт таблицу _prisma_migrations, поэтому мы добавляем её вручную
 * с записью об init миграции. Это нужно чтобы applyPrismaMigrations() не пыталась
 * применить init миграцию на уже созданных таблицах.
 *
 * Устанавливает PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION и сбрасывает CI переменные.
 *
 * Использование:
 *   bun tsx scripts/db-template-safe.ts
 */

import Database from 'better-sqlite3'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFileSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const CONSENT = 'automated-safe-dev-rebuild'

console.log('🔄 Обновление template.db...')

/**
 * Запуск команды с заданным окружением (без shell injection)
 */
function runCommand(cmd: string, args: string[], env: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: path.join(__dirname, '..'),
      env,
      stdio: 'inherit',
      shell: true, // Нужен для поиска npx в PATH на Windows
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with code ${code}`))
      }
    })

    child.on('error', reject)
  })
}

async function main() {
  try {
    // 1. Сброс CI переменных окружения и установка consent
    const env = {
      ...process.env,
      CI: '',
      VERCEL: '',
      GITHUB_ACTIONS: '',
      GITLAB: '',
      NETLIFY: '',
      HEROKU: '',
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: CONSENT,
    }

    // 2. Удаляем старую dev БД для чистого состояния
    const appDbPath = path.join(__dirname, '..', 'prisma', 'data', 'app.db')
    const templateDbPath = path.join(__dirname, '..', 'resources', 'template.db')

    console.log('🗑️  Удаление старой dev БД...')
    try {
      rmSync(appDbPath, { force: true })
      rmSync(`${appDbPath}-journal`, { force: true })
    } catch {
      // Игнорируем, если файлов нет
    }

    // 3. Выполняем prisma db push для создания чистой БД
    // v0.28.9: После удаления FTS5 можно использовать db push
    // Prisma 7: url больше нельзя указывать в datasource schema файла,
    // поэтому создаём временную копию без url и передаём через --url
    console.log('📦 Создание БД через db push...')
    const schemaPath = path.join(__dirname, '..', 'renderer', 'src', 'generated', 'schema.prisma')
    const tempSchemaPath = path.join(__dirname, '..', 'renderer', 'src', 'generated', 'schema.prisma.tmp')
    const schemaContent = readFileSync(schemaPath, 'utf-8')
    const patchedSchema = schemaContent.replace(/^\s*url\s*=\s*"[^"]*"\s*$/m, '')
    writeFileSync(tempSchemaPath, patchedSchema)

    try {
      await runCommand(
        'npx',
        ['prisma', 'db', 'push', '--schema', tempSchemaPath, '--url', `file:${appDbPath}`, '--accept-data-loss'],
        env,
      )
    } finally {
      // Удаляем временный schema файл
      try {
        rmSync(tempSchemaPath)
      } catch {
        /* ignore */
      }
    }

    // 4. Добавляем таблицу _prisma_migrations с записью об init миграции
    // db push не создаёт эту таблицу, но applyPrismaMigrations() её ожидает
    console.log('📝 Создание таблицы _prisma_migrations...')

    const db = new Database(appDbPath)
    try {
      // Создаём таблицу миграций
      db.exec(`
        CREATE TABLE IF NOT EXISTS _prisma_migrations (
          id TEXT PRIMARY KEY NOT NULL,
          checksum TEXT NOT NULL,
          finished_at DATETIME,
          migration_name TEXT NOT NULL UNIQUE,
          logs TEXT,
          rolled_back_at DATETIME,
          started_at DATETIME NOT NULL DEFAULT current_timestamp,
          applied_steps_count INTEGER NOT NULL DEFAULT 0
        )
      `)

      // Находим все миграции и записываем их как применённые
      const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations')
      const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^\d{14}_/.test(d.name))
        .map((d) => d.name)
        .sort()

      const insertStmt = db.prepare(`
        INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
        VALUES (?, '', ?, datetime('now'), datetime('now'), 0)
      `)

      for (const migrationName of migrationFolders) {
        insertStmt.run(randomUUID(), migrationName)
        console.log(`  ✓ ${migrationName}`)
      }

      console.log(`📋 Записано ${migrationFolders.length} миграций`)
    } finally {
      db.close()
    }

    // 5. Копируем app.db в template.db
    console.log('📋 Копирование в template.db...')
    copyFileSync(appDbPath, templateDbPath)

    console.log('✅ template.db обновлён успешно!')
  } catch (error) {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  }
}

main()
