import * as fs from 'node:fs'
import * as path from 'node:path'

// Импорт ZenStack ORM (динамическая загрузка через require)

let ZenStackClient: typeof import('@zenstackhq/orm').ZenStackClient

let PolicyPlugin: typeof import('@zenstackhq/plugin-policy').PolicyPlugin

let SqlJsDialect: typeof import('kysely-wasm').SqlJsDialect
let initSqlJs: ReturnType<typeof require>

let schema: typeof import('../../../schema').schema

try {
  ZenStackClient = require('@zenstackhq/orm').ZenStackClient
} catch (e) {
  console.error('[ZenStack] Failed to load @zenstackhq/orm:', e)
  throw e
}

try {
  PolicyPlugin = require('@zenstackhq/plugin-policy').PolicyPlugin
} catch (e) {
  console.error('[ZenStack] Failed to load @zenstackhq/plugin-policy:', e)
  throw e
}

try {
  SqlJsDialect = require('kysely-wasm').SqlJsDialect
} catch (e) {
  console.error('[ZenStack] Failed to load kysely-wasm:', e)
  throw e
}

try {
  // sql.js (WASM) для работы с SQLite в renderer процессе
  initSqlJs = require('fts5-sql-bundle/dist/sql-asm.js')
} catch (e) {
  console.error('[ZenStack] Failed to load sql.js:', e)
  throw e
}

try {
  schema = require('../../../schema').schema
} catch (e) {
  console.error('[ZenStack] Failed to load schema:', e)
  throw e
}

/**
 * Вычислить абсолютный путь к файлу БД
 * Поддерживает разные контексты запуска (dev, production)
 */
function getDatabasePath(): string {
  // Если путь задан через переменную окружения — используем его
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH
  }

  const cwd = process.cwd()
  let dbPath: string

  // Определяем путь к БД относительно корня приложения
  if (cwd.includes('renderer')) {
    // Если cwd в renderer (nextron dev)
    dbPath = path.resolve(cwd, '..', 'prisma', 'data', 'app.db')
  } else if (cwd.includes('animatrona')) {
    // Если cwd в animatrona
    dbPath = path.resolve(cwd, 'prisma', 'data', 'app.db')
  } else {
    // Если cwd в корне монорепо
    dbPath = path.resolve(cwd, 'apps', 'animatrona', 'prisma', 'data', 'app.db')
  }

  return dbPath
}

/**
 * Путь к файлу БД (вычисляется один раз при импорте)
 */
const DB_PATH = getDatabasePath()

/**
 * Кэш для sql.js Database и ORM
 */
let dbPromise: Promise<{
  orm: ReturnType<typeof ZenStackClient.prototype.$use>
  saveDb: () => void
}> | null = null

/**
 * Инициализация sql.js и ZenStack ORM
 */
async function initDatabase() {
  try {
    // Инициализируем sql.js (загружает WASM)
    const SQL = await initSqlJs()

    // Загружаем существующую БД или создаём новую
    let db: InstanceType<typeof SQL.Database>
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH)
      db = new SQL.Database(buffer)
    } else {
      // Создаём папку если нет
      const dir = path.dirname(DB_PATH)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      db = new SQL.Database()
    }

    // Функция для сохранения БД в файл
    const saveDb = () => {
      const data = db.export()
      const buffer = Buffer.from(data)
      fs.writeFileSync(DB_PATH, buffer)
    }

    // Создаём ZenStack ORM с sql.js диалектом
    const dialectConfig = { database: db }
    const baseOrm = new ZenStackClient(schema, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SqlJsDialect несовместим с типами ZenStack
      dialect: new SqlJsDialect(dialectConfig) as any,
    })
    const ormWithPolicy = baseOrm.$use(new PolicyPlugin())

    // Создаём Proxy для автосохранения после мутаций
    const createAutoSaveProxy = (target: typeof ormWithPolicy): typeof ormWithPolicy => {
      return new Proxy(target, {
        get(obj, prop) {
          const value = obj[prop as keyof typeof obj]

          // Если это модель (anime, episode, и т.д.)
          if (typeof value === 'object' && value !== null) {
            return new Proxy(value, {
              get(modelObj, modelProp) {
                const modelValue = modelObj[modelProp as keyof typeof modelObj]

                // Если это мутация (create, update, delete, etc.)
                if (typeof modelValue === 'function') {
                  const methodName = String(modelProp)
                  const isMutation =
                    methodName.startsWith('create') ||
                    methodName.startsWith('update') ||
                    methodName.startsWith('delete') ||
                    methodName.startsWith('upsert')

                  if (isMutation) {
                    return async (...args: unknown[]) => {
                      const result = await (modelValue as (...a: unknown[]) => Promise<unknown>).apply(modelObj, args)
                      // Сохраняем БД после мутации
                      saveDb()
                      return result
                    }
                  }
                }
                return modelValue
              },
            })
          }
          return value
        },
      })
    }

    const orm = createAutoSaveProxy(ormWithPolicy)

    return {
      orm,
      saveDb,
    }
  } catch (error) {
    console.error('[ZenStack] initDatabase() failed:', error)
    throw error
  }
}

/**
 * Получить инициализированную БД (singleton)
 */
function getDatabase() {
  if (!dbPromise) {
    dbPromise = initDatabase()
  }
  return dbPromise
}

/**
 * Возвращает enhanced ORM client для использования с ZenStack v3.
 * В этом приложении нет аутентификации, поэтому используем без user context.
 *
 * ВАЖНО: Это асинхронная функция из-за инициализации sql.js WASM
 */
export async function getEnhancedPrisma() {
  try {
    const { orm } = await getDatabase()
    return orm
  } catch (error) {
    console.error('[ZenStack] getEnhancedPrisma() failed:', error)
    throw error
  }
}

/**
 * Принудительное сохранение БД в файл
 */
export async function flushDatabase() {
  const { saveDb } = await getDatabase()
  saveDb()
}
