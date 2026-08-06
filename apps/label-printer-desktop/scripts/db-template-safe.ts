#!/usr/bin/env tsx
/**
 * Создание template.db через prisma db push
 *
 * Создаёт чистую БД со всеми таблицами и копирует в resources/template.db.
 * Template используется при первом запуске приложения на машине пользователя.
 *
 * ВАЖНО: db push не создаёт таблицу _prisma_migrations, поэтому мы добавляем её вручную
 * с записью обо всех миграциях. Это нужно чтобы applyPrismaMigrations() не пыталась
 * применить init миграцию на уже созданных таблицах.
 *
 * Использование:
 *   bun run scripts/db-template-safe.ts
 */

import { Database } from 'bun:sqlite'
// spawn используется для запуска npx prisma — аргументы статические, без пользовательского ввода
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const CONSENT = 'automated-safe-dev-rebuild'

console.log('Обновление template.db...')

/**
 * Запуск команды с заданным окружением (аргументы всегда статические)
 */
function runCommand(cmd: string, args: string[], env: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: path.join(__dirname, '..'),
      env,
      stdio: 'inherit',
      shell: true,
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

    // 2. Пути к файлам
    const appDbPath = path.join(__dirname, '..', 'prisma', 'data', 'app.db')
    const resourcesDir = path.join(__dirname, '..', 'resources')
    const templateDbPath = path.join(resourcesDir, 'template.db')
    const migrationsDir = path.join(__dirname, '..', 'src', 'generated', 'migrations')

    // 3. Удаляем старую dev БД для чистого состояния
    console.log('Удаление старой dev БД...')
    try {
      rmSync(appDbPath, { force: true })
      rmSync(`${appDbPath}-journal`, { force: true })
    } catch {
      // Игнорируем, если файлов нет
    }

    // 4. Выполняем prisma db push для создания чистой БД
    console.log('Создание БД через db push...')
    await runCommand(
      'npx',
      ['prisma', 'db', 'push', '--schema', 'src/generated/schema.prisma', '--accept-data-loss', '--skip-generate'],
      env,
    )

    // 5. Добавляем таблицу _prisma_migrations с записью обо всех миграциях
    // db push не создаёт эту таблицу, но applyPrismaMigrations() её ожидает
    console.log('Создание таблицы _prisma_migrations...')

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
      if (existsSync(migrationsDir)) {
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
          console.log(`  + ${migrationName}`)
        }

        console.log(`Записано ${migrationFolders.length} миграций`)
      } else {
        console.log('Папка миграций не найдена, пропускаем')
      }
    } finally {
      db.close()
    }

    // 6. Создаём папку resources если нет
    if (!existsSync(resourcesDir)) {
      mkdirSync(resourcesDir, { recursive: true })
    }

    // 7. Копируем app.db в template.db
    console.log('Копирование в template.db...')
    copyFileSync(appDbPath, templateDbPath)

    console.log('template.db обновлён успешно!')
  } catch (error) {
    console.error('Ошибка:', error)
    process.exit(1)
  }
}

main()
