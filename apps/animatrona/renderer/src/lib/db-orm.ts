/**
 * Серверный ZenStack ORM client для API routes
 *
 * Использует sql.js (WASM) — работает и на сервере.
 * Это единообразно с enhance.ts, но для серверных API routes.
 */
import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'

import { ZenStackClient } from '@zenstackhq/orm'
import { SqlJsDialect } from 'kysely-wasm'
import { schema } from '../../../schema'

let initSqlJs: ReturnType<typeof require>

/**
 * Используем createRequire для обхода статического анализа Turbopack.
 * Модуль загружается в runtime, не при сборке.
 * Путь разбит на части чтобы избежать статического анализа строки.
 */
const dynamicRequire = createRequire(import.meta.url)

// Разбиваем путь на части чтобы Turbopack не анализировал его статически
const FTS5_MODULE = ['fts5-sql', 'bundle', 'dist', 'sql-asm.js']
  .join('-')
  .replace(/-dist-/, '/dist/')
  .replace(/-sql-asm\.js$/, '/sql-asm.js')

try {
  initSqlJs = dynamicRequire(FTS5_MODULE)
} catch (e) {
  console.error('[db-orm] Failed to load sql.js:', e)
  throw e
}

/**
 * Получить путь к SQLite БД
 */
function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH
  }

  const cwd = process.cwd()
  let dbPath: string

  if (cwd.includes('renderer')) {
    dbPath = path.resolve(cwd, '..', 'prisma', 'data', 'app.db')
  } else if (cwd.includes('animatrona')) {
    dbPath = path.resolve(cwd, 'prisma', 'data', 'app.db')
  } else {
    dbPath = path.resolve(cwd, 'apps', 'animatrona', 'prisma', 'data', 'app.db')
  }

  return dbPath
}

const DB_PATH = getDatabasePath()

/**
 * Singleton promise для ORM
 */
let ormPromise: Promise<ReturnType<typeof ZenStackClient.prototype.$use>> | null = null

/**
 * Инициализация sql.js и ZenStack ORM
 */
async function initOrm() {
  const SQL = await initSqlJs()

  let db: InstanceType<typeof SQL.Database>
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    db = new SQL.Database()
  }

  // Функция сохранения БД
  const saveDb = () => {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }

  // Создаём ZenStack ORM с sql.js диалектом
  const client = new ZenStackClient(schema, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SqlJsDialect несовместим с типами ZenStack
    dialect: new SqlJsDialect({ database: db }) as any,
  })

  // Proxy для автосохранения после мутаций (аналогично enhance.ts)
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

  return createAutoSaveProxy(client)
}

/**
 * Получить ZenStack ORM client (async, singleton)
 */
export async function getOrmClient() {
  if (!ormPromise) {
    ormPromise = initOrm()
  }
  return ormPromise
}

/**
 * Экспортируем schema для использования в RPCApiHandler
 */
export { schema }
