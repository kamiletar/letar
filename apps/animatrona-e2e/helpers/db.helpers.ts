/**
 * Хелперы для работы с SQLite базой данных в тестах.
 *
 * Использует fts5-sql-bundle (sql.js с FTS5 поддержкой) для:
 * - Создания чистой тестовой БД из template
 * - Seed тестовых данных
 * - Проверки состояния после тестов
 */

import * as fs from 'fs'
import * as path from 'path'
// fts5-sql-bundle — sql.js с поддержкой FTS5 (используется в animatrona)
import initSqlJs from 'fts5-sql-bundle'
import type { SqlJsStatic } from 'sql.js'

// Пути
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..')
const TEMPLATE_DB = path.join(WORKSPACE_ROOT, 'apps/animatrona/resources/template.db')
const TEST_DB_DIR = path.join(WORKSPACE_ROOT, 'apps/animatrona-e2e/fixtures/test-db')

// Путь к WASM файлу fts5-sql-bundle
const WASM_PATH = path.join(WORKSPACE_ROOT, 'node_modules/fts5-sql-bundle/dist/sql-wasm.wasm')

// Кэш инициализированного sql.js
let sqlPromise: Promise<SqlJsStatic> | null = null

/**
 * Получить инициализированный sql.js с FTS5 поддержкой
 */
async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => WASM_PATH,
    })
  }
  return await sqlPromise
}

/**
 * Создать чистую тестовую БД из template
 *
 * @returns Путь к созданной тестовой БД
 */
export async function createTestDatabase(): Promise<string> {
  // Создаём директорию если нет
  if (!fs.existsSync(TEST_DB_DIR)) {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true })
  }

  // Уникальное имя для параллельных тестов
  const testDbPath = path.join(TEST_DB_DIR, `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)

  // Копируем template
  fs.copyFileSync(TEMPLATE_DB, testDbPath)

  return testDbPath
}

/**
 * Удалить тестовую БД
 */
export function deleteTestDatabase(dbPath: string): void {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
  }
}

/**
 * Очистить все тестовые БД
 */
export function cleanupAllTestDatabases(): void {
  if (!fs.existsSync(TEST_DB_DIR)) {
    return
  }

  const files = fs.readdirSync(TEST_DB_DIR)
  for (const file of files) {
    if (file.startsWith('test-') && file.endsWith('.db')) {
      fs.unlinkSync(path.join(TEST_DB_DIR, file))
    }
  }
}

/**
 * Добавить тестовое аниме в БД
 */
export async function seedAnime(
  dbPath: string,
  anime: {
    id: string
    name: string
    originalName?: string
    shikimoriId?: number
    year?: number
    status?: string
  }
): Promise<void> {
  const SQL = await getSqlJs()
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

  try {
    const now = new Date().toISOString()
    db.run(
      `INSERT INTO Anime (id, name, originalName, shikimoriId, year, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        anime.id,
        anime.name,
        anime.originalName || null,
        anime.shikimoriId || null,
        anime.year || null,
        anime.status || 'NOT_STARTED',
        now,
        now,
      ]
    )

    // Сохраняем изменения
    fs.writeFileSync(dbPath, Buffer.from(db.export()))
  } finally {
    db.close()
  }
}

/**
 * Добавить тестовый эпизод в БД
 *
 * Примечания по схеме Episode:
 * - seasonId (FK к Season), а не seasonNumber
 * - sourcePath — путь к исходному файлу
 * - transcodedPath — путь к транскодированному файлу
 * - НЕТ колонки filePath!
 */
export async function seedEpisode(
  dbPath: string,
  episode: {
    id: string
    animeId: string
    seasonId?: string | null
    number: number
    name?: string
    sourcePath?: string
    transcodedPath?: string
  }
): Promise<void> {
  const SQL = await getSqlJs()
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

  try {
    const now = new Date().toISOString()
    db.run(
      `INSERT INTO Episode (id, animeId, seasonId, number, name, sourcePath, transcodedPath, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        episode.id,
        episode.animeId,
        episode.seasonId || null,
        episode.number,
        episode.name || null,
        episode.sourcePath || null,
        episode.transcodedPath || null,
        now,
        now,
      ]
    )

    fs.writeFileSync(dbPath, Buffer.from(db.export()))
  } finally {
    db.close()
  }
}

/**
 * Получить количество аниме в БД
 */
export async function getAnimeCount(dbPath: string): Promise<number> {
  const SQL = await getSqlJs()
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

  try {
    const result = db.exec('SELECT COUNT(*) as count FROM Anime')
    return (result[0]?.values[0]?.[0] as number) || 0
  } finally {
    db.close()
  }
}

/**
 * Получить количество эпизодов в БД
 */
export async function getEpisodeCount(dbPath: string): Promise<number> {
  const SQL = await getSqlJs()
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

  try {
    const result = db.exec('SELECT COUNT(*) as count FROM Episode')
    return (result[0]?.values[0]?.[0] as number) || 0
  } finally {
    db.close()
  }
}

/**
 * Найти аниме по имени
 */
export async function findAnimeByName(
  dbPath: string,
  name: string
): Promise<{ id: string; name: string; shikimoriId: number | null } | null> {
  const SQL = await getSqlJs()
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

  try {
    const stmt = db.prepare('SELECT id, name, shikimoriId FROM Anime WHERE name = ?')
    stmt.bind([name])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return {
        id: row.id as string,
        name: row.name as string,
        shikimoriId: row.shikimoriId as number | null,
      }
    }

    stmt.free()
    return null
  } finally {
    db.close()
  }
}

/**
 * Получить все аниме
 */
export async function getAllAnime(
  dbPath: string
): Promise<Array<{ id: string; name: string; shikimoriId: number | null }>> {
  const SQL = await getSqlJs()
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

  try {
    const result = db.exec('SELECT id, name, shikimoriId FROM Anime ORDER BY name')
    if (!result[0]) {
      return []
    }

    return result[0].values.map((row: (string | number | Uint8Array | null)[]) => ({
      id: row[0] as string,
      name: row[1] as string,
      shikimoriId: row[2] as number | null,
    }))
  } finally {
    db.close()
  }
}

// ==================== Full Seed для Watch Page ====================

/**
 * Полные тестовые данные для watch page
 */
export interface WatchPageSeedData {
  anime: {
    id: string
    name: string
    originalName?: string
    shikimoriId?: number
    year?: number
    status?: string
  }
  episode: {
    id: string
    seasonId?: string | null
    number: number
    name?: string
    sourcePath?: string
    transcodedPath?: string
  }
}

/**
 * Создать полностью заполненную тестовую БД для watch page тестов
 *
 * @returns Путь к созданной БД и данные
 */
export async function createSeededDatabase(data: WatchPageSeedData): Promise<{
  dbPath: string
  animeId: string
  episodeId: string
}> {
  // Создаём БД из template
  const dbPath = await createTestDatabase()

  // Seed аниме
  await seedAnime(dbPath, data.anime)

  // Seed эпизод
  await seedEpisode(dbPath, {
    id: data.episode.id,
    animeId: data.anime.id,
    seasonId: data.episode.seasonId,
    number: data.episode.number,
    name: data.episode.name,
    sourcePath: data.episode.sourcePath,
    transcodedPath: data.episode.transcodedPath,
  })

  return {
    dbPath,
    animeId: data.anime.id,
    episodeId: data.episode.id,
  }
}

/**
 * Скопировать seeded БД в userData директорию Electron
 *
 * Electron использует userData/data/app.db для хранения данных.
 * Этот хелпер копирует заполненную БД в нужное место перед запуском теста.
 *
 * @param sourcePath - Путь к seeded БД
 * @param userDataDir - Путь к изолированной userData директории
 * @param libraryPath - Опционально: путь к изолированной папке библиотеки
 */
export async function copyDatabaseToUserData(
  sourcePath: string,
  userDataDir: string,
  libraryPath?: string
): Promise<void> {
  const targetDir = path.join(userDataDir, 'data')
  const targetPath = path.join(targetDir, 'app.db')

  // Создаём директорию если нет
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  // Копируем БД
  fs.copyFileSync(sourcePath, targetPath)

  // Если указан libraryPath — обновляем настройки в БД чтобы не трогать реальную библиотеку
  // Примечание: таблица Settings имеет только updatedAt (@updatedAt), БЕЗ createdAt
  if (libraryPath) {
    const SQL = await getSqlJs()
    const buffer = fs.readFileSync(targetPath)
    const db = new SQL.Database(buffer)

    try {
      // Проверяем есть ли запись в Settings
      const result = db.exec("SELECT id FROM Settings WHERE id = 'default'")
      const now = new Date().toISOString()

      if (result.length > 0 && result[0].values.length > 0) {
        // Обновляем libraryPath и updatedAt
        db.run('UPDATE Settings SET libraryPath = ?, updatedAt = ? WHERE id = ?', [libraryPath, now, 'default'])
      } else {
        // Создаём запись с libraryPath (id, libraryPath, updatedAt)
        db.run('INSERT INTO Settings (id, libraryPath, updatedAt) VALUES (?, ?, ?)', ['default', libraryPath, now])
      }

      fs.writeFileSync(targetPath, Buffer.from(db.export()))
    } finally {
      db.close()
    }
  }
}

/**
 * Получить путь к БД в userData директории
 */
export function getDatabasePath(userDataDir: string): string {
  return path.join(userDataDir, 'data', 'app.db')
}

/**
 * Проверить существует ли БД в userData
 */
export function databaseExists(userDataDir: string): boolean {
  return fs.existsSync(getDatabasePath(userDataDir))
}

/**
 * Стандартные тестовые данные для watch page
 */
export const DEFAULT_WATCH_PAGE_SEED: WatchPageSeedData = {
  anime: {
    id: 'test-anime-001',
    name: 'Test Anime',
    originalName: 'テストアニメ',
    shikimoriId: 12345,
    year: 2024,
    status: 'WATCHING',
  },
  episode: {
    id: 'test-episode-001',
    seasonId: null, // Без привязки к сезону для простоты
    number: 1,
    name: 'Episode 1',
    // Пути будут заменены на реальные при создании seed
    sourcePath: undefined,
    transcodedPath: undefined,
  },
}
