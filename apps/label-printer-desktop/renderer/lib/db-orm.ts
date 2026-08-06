/**
 * Серверный ZenStack ORM client для API routes
 *
 * Использует sql.js (asm.js) — работает в Electron без WASM файла.
 * Единственный источник БД для API routes и server actions.
 */
import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'

import { ZenStackClient } from '@zenstackhq/orm'
import { SqlJsDialect } from 'kysely-wasm'
import { schema } from '../../schema'

let initSqlJs: ReturnType<typeof require>

/**
 * Используем createRequire для обхода статического анализа Turbopack.
 * Модуль загружается в runtime, не при сборке.
 */
const dynamicRequire = createRequire(import.meta.url)

try {
  // Загружаем sql.js asm.js версию (без WASM файла)
  initSqlJs = dynamicRequire('sql.js/dist/sql-asm.js')
} catch (e) {
  console.error('[db-orm] Failed to load sql.js:', e)
  throw e
}

/**
 * Получить путь к SQLite БД
 */
function getDatabasePath(): string {
  // В production DATABASE_PATH устанавливается main процессом Electron
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH
  }

  const cwd = process.cwd()

  // Определяем путь к БД относительно cwd
  if (cwd.includes('renderer')) {
    return path.resolve(cwd, '..', 'prisma', 'data', 'app.db')
  } else if (cwd.includes('label-printer-desktop')) {
    return path.resolve(cwd, 'prisma', 'data', 'app.db')
  } else {
    return path.resolve(cwd, 'apps', 'label-printer-desktop', 'prisma', 'data', 'app.db')
  }
}

const DB_PATH = getDatabasePath()

/**
 * Простая реализация debounce
 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T & { flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }) as T & { flush: () => void }

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
      fn()
    }
  }

  return debounced
}

/**
 * Singleton promise для ORM
 */
let ormPromise:
  | Promise<{
    client: ReturnType<typeof ZenStackClient.prototype.$use>
    saveDb: ReturnType<typeof debounce<() => void>>
  }>
  | null = null

/**
 * Инициализация sql.js и ZenStack ORM
 */
async function initOrm() {
  const SQL = await initSqlJs()

  let db: InstanceType<typeof SQL.Database>
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
    console.warn('[db-orm] Loaded DB from:', DB_PATH)
  } else {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    console.warn('[db-orm] Creating new empty DB')
    db = new SQL.Database()
  }

  // Функция сохранения БД в файл (debounced)
  const saveDbImmediate = () => {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }

  const saveDb = debounce(saveDbImmediate, 500)

  // Логируем таблицы в БД для отладки
  try {
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    console.warn(
      '[db-orm] Tables in DB:',
      tables[0]?.values.map((v: unknown[]) => v[0]),
    )
  } catch (err) {
    console.error('[db-orm] Failed to list tables:', err)
  }

  // Создаём ZenStack ORM с sql.js диалектом и логированием запросов
  const client = new ZenStackClient(schema, {
    dialect: new SqlJsDialect({ database: db }),
    log: ['error'],
  })

  // Proxy для автосохранения после мутаций
  const createAutoSaveProxy = (target: typeof client): typeof client => {
    return new Proxy(target, {
      get(obj, prop) {
        const value = obj[prop as keyof typeof obj]

        if (typeof value === 'object' && value !== null) {
          return new Proxy(value, {
            get(modelObj, modelProp) {
              const modelValue = modelObj[modelProp as keyof typeof modelObj]

              if (typeof modelValue === 'function') {
                const methodName = String(modelProp)
                const isMutation = methodName.startsWith('create')
                  || methodName.startsWith('update')
                  || methodName.startsWith('delete')
                  || methodName.startsWith('upsert')

                if (isMutation) {
                  return async (...args: unknown[]) => {
                    const result = await (modelValue as (...a: unknown[]) => Promise<unknown>).apply(modelObj, args)
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

  return {
    client: createAutoSaveProxy(client),
    saveDb,
  }
}

/**
 * Получить ZenStack ORM client (async, singleton)
 */
export async function getOrmClient() {
  if (!ormPromise) {
    ormPromise = initOrm()
  }
  const { client } = await ormPromise
  return client
}

/**
 * Принудительное сохранение БД в файл (при выходе из приложения)
 */
export async function flushDatabase() {
  if (ormPromise) {
    const { saveDb } = await ormPromise
    saveDb.flush()
  }
}

/**
 * Экспортируем schema для использования в RPCApiHandler
 */
export { schema }
