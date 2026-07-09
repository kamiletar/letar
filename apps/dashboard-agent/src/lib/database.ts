/**
 * Database Utilities
 * Функции для работы с PostgreSQL базами данных
 */

import { existsSync, readFileSync } from 'fs'
import { Client } from 'pg'
import { getContainers } from './docker'
import { getCurrentServer, SERVER_APPS } from './server-config'

/**
 * Конфигурация приложений с PostgreSQL базой данных
 * Аналогично dashboard/src/lib/secrets.ts
 */
const APP_CONFIG = {
  'premium-rosstil': {
    secretsPath: '/secrets/premium-rosstil.env',
    containerName: 'premium-rosstil-postgres',
    defaults: {
      host: 'premium-rosstil-postgres',
      port: 5432,
      database: 'lena_premium',
      user: 'lena_user',
    },
  },
  imot: {
    secretsPath: '/secrets/imot.env',
    containerName: 'imot-postgres',
    defaults: {
      host: 'imot-postgres',
      port: 5432,
      database: 'lena_imot',
      user: 'lena_user',
    },
  },
  mandala: {
    secretsPath: '/secrets/mandala.env',
    containerName: 'mandala-db',
    defaults: {
      host: 'mandala-db',
      port: 5432,
      database: 'mandala',
      user: 'lena_user',
    },
  },
  kami: {
    secretsPath: '/secrets/kami.env',
    containerName: 'kami-db',
    defaults: {
      host: 'kami-db',
      port: 5432,
      database: 'lena_kami',
      user: 'lena_user',
    },
  },
  'driving-school': {
    secretsPath: '/secrets/driving-school.env',
    containerName: 'driving-school-db',
    defaults: {
      host: 'driving-school-db',
      port: 5432,
      database: 'lena_driving_school',
      user: 'lena_user',
    },
  },
  umami: {
    secretsPath: '/secrets/umami.env',
    containerName: 'umami-db',
    defaults: {
      host: 'umami-db',
      port: 5432,
      database: 'umami',
      user: 'umami_user',
    },
  },
  'animatrona-tracker': {
    secretsPath: '/secrets/animatrona-tracker.env',
    containerName: 'animatrona-tracker-db',
    defaults: {
      host: 'animatrona-tracker-db',
      port: 5432,
      database: 'animatrona_tracker',
      user: 'animatrona_user',
    },
  },
  dashboard: {
    secretsPath: '/secrets/dashboard.env',
    containerName: 'dashboard-db',
    defaults: {
      host: 'dashboard-db',
      port: 5432,
      database: 'dashboard',
      user: 'dashboard_user',
    },
  },
  archetest: {
    secretsPath: '/secrets/archetest.env',
    containerName: 'archetest-db',
    defaults: {
      host: 'archetest-db',
      port: 5432,
      database: 'archetest',
      user: 'archetest',
    },
  },
  'auth-hub': {
    secretsPath: '/secrets/auth-hub.env',
    containerName: 'auth-hub-db',
    defaults: {
      host: 'auth-hub-db',
      port: 5432,
      database: 'lena_auth',
      user: 'lena_user',
    },
  },
  time: {
    secretsPath: '/secrets/time.env',
    containerName: 'time-db',
    defaults: {
      host: 'time-db',
      port: 5432,
      database: 'time',
      user: 'time',
    },
  },
  'form-example': {
    secretsPath: '/secrets/form-example.env',
    containerName: 'form-example-db',
    defaults: {
      host: 'form-example-db',
      port: 5432,
      database: 'forms_example',
      user: 'forms',
    },
  },
  dsperevod: {
    secretsPath: '/secrets/dsperevod.env',
    containerName: 'dsperevod-db',
    defaults: {
      host: 'dsperevod-db',
      port: 5432,
      database: 'dsperevod',
      user: 'dsperevod',
    },
  },
  grandslamcup: {
    secretsPath: '/secrets/grandslamcup.env',
    containerName: 'grandslamcup-db',
    defaults: {
      host: 'grandslamcup-db',
      port: 5432,
      database: 'grandslamcup',
      user: 'postgres',
    },
  },
  svoichuzhie: {
    secretsPath: '/secrets/svoichuzhie.env',
    containerName: 'svoichuzhie-db',
    defaults: {
      host: 'svoichuzhie-db',
      port: 5432,
      database: 'svoichuzhie',
      user: 'svoichuzhie_user',
    },
  },
} as const

type AppName = keyof typeof APP_CONFIG

/**
 * Получает список приложений с БД для текущего сервера
 */
function getAvailableAppNames(): AppName[] {
  const currentServer = getCurrentServer()
  return (Object.keys(APP_CONFIG) as AppName[]).filter((name) => SERVER_APPS[name] === currentServer)
}

export interface DbConfig {
  name: AppName
  containerName: string
  host: string
  port: number
  database: string
  user: string
  password: string
}

export interface DatabaseContainerStatus {
  found: boolean
  running: boolean
  containerName: string
  containerId?: string
  state?: string
  status?: string
  created?: number
}

export interface DatabaseStatus {
  name: string
  containerStatus: DatabaseContainerStatus
  connectionOk: boolean
  host: string
  port: number
  database: string
}

export interface DatabaseStats {
  size: number
  connections: number
  tables: Array<{
    schemaname: string
    tablename: string
    size: number
    size_pretty: string
  }>
  version: string
}

export interface DatabaseStatsResult {
  name: string
  success: boolean
  stats?: DatabaseStats
  error?: string
}

// Кэш для распарсенных .env файлов
const envCache = new Map<string, Record<string, string>>()

/**
 * Парсит .env файл и возвращает объект с переменными
 */
function parseEnvFile(filePath: string): Record<string, string> {
  if (envCache.has(filePath)) {
    return envCache.get(filePath)!
  }

  const result: Record<string, string> = {}

  if (!existsSync(filePath)) {
    console.warn(`Secrets file not found: ${filePath}`)
    return result
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) {
        continue
      }

      const key = trimmed.substring(0, eqIndex).trim()
      let value = trimmed.substring(eqIndex + 1).trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      result[key] = value
    }

    envCache.set(filePath, result)
  } catch (error) {
    console.error(`Error parsing env file ${filePath}:`, error)
  }

  return result
}

/**
 * Получает конфигурацию БД для приложения
 */
function getAppDbConfig(appName: AppName): DbConfig {
  const config = APP_CONFIG[appName]
  const env = parseEnvFile(config.secretsPath)

  return {
    name: appName,
    containerName: config.containerName,
    host: config.defaults.host,
    port: config.defaults.port,
    database: env['POSTGRES_DB'] || config.defaults.database,
    user: env['POSTGRES_USER'] || config.defaults.user,
    password: env['DB_PASSWORD'] || 'postgres',
  }
}

/**
 * Получение конфигураций БД для текущего сервера
 * Автоматически фильтрует по SERVER_NAME
 */
export function getDbConfigs(): DbConfig[] {
  return getAvailableAppNames().map((appName) => getAppDbConfig(appName))
}

/**
 * Получение конфигурации БД по имени
 */
export function getDbConfig(name: string): DbConfig | undefined {
  return getDbConfigs().find((config) => config.name === name)
}

/**
 * Статус БД контейнера
 */
export async function getDatabaseContainerStatus(dbName: string): Promise<DatabaseContainerStatus> {
  const config = getDbConfig(dbName)
  if (!config) {
    throw new Error(`Database config not found: ${dbName}`)
  }

  try {
    const containers = await getContainers(true)
    const container = containers.find((c) => c.name.includes(config.containerName))

    if (!container) {
      return {
        found: false,
        running: false,
        containerName: config.containerName,
      }
    }

    return {
      found: true,
      running: container.state === 'running',
      containerName: config.containerName,
      containerId: container.id,
      state: container.state,
      status: container.status,
      created: container.created,
    }
  } catch (error) {
    console.error(`Error getting database container status for ${dbName}:`, error)
    throw error
  }
}

/**
 * Проверка подключения к БД
 */
export async function testDatabaseConnection(dbConfig: DbConfig): Promise<boolean> {
  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    connectionTimeoutMillis: 5000,
  })

  try {
    await client.connect()
    await client.query('SELECT 1')
    return true
  } catch (error) {
    console.error(`Error connecting to database ${dbConfig.name}:`, error)
    return false
  } finally {
    await client.end()
  }
}

/**
 * Получение статуса всех БД
 */
export async function getAllDatabaseStatuses(): Promise<DatabaseStatus[]> {
  const configs = getDbConfigs()

  const statuses = await Promise.all(
    configs.map(async (config) => {
      const containerStatus = await getDatabaseContainerStatus(config.name)

      let connectionOk = false
      if (containerStatus.running) {
        connectionOk = await testDatabaseConnection(config)
      }

      return {
        name: config.name,
        containerStatus,
        connectionOk,
        host: config.host,
        port: config.port,
        database: config.database,
      }
    })
  )

  return statuses
}

/**
 * Статистика БД
 */
export async function getDatabaseStats(dbConfig: DbConfig): Promise<DatabaseStats> {
  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    connectionTimeoutMillis: 10000,
  })

  try {
    await client.connect()

    // Размер БД
    const sizeQuery = `SELECT pg_database_size(current_database()) as size;`
    const sizeResult = await client.query(sizeQuery)
    const size = parseInt(sizeResult.rows[0]?.size || '0', 10)

    // Количество подключений
    const connectionsQuery = `
      SELECT count(*) as count FROM pg_stat_activity
      WHERE datname = current_database();
    `
    const connectionsResult = await client.query(connectionsQuery)
    const connections = parseInt(connectionsResult.rows[0]?.count || '0', 10)

    // Список таблиц с размерами
    const tablesQuery = `
      SELECT
        n.nspname as schemaname,
        c.relname as tablename,
        pg_total_relation_size(c.oid) AS size,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS size_pretty
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT 10;
    `
    const tablesResult = await client.query(tablesQuery)
    const tables = tablesResult.rows

    // Версия PostgreSQL
    const versionQuery = 'SELECT version();'
    const versionResult = await client.query(versionQuery)
    const version = versionResult.rows[0]?.version || 'Unknown'

    return {
      size,
      connections,
      tables,
      version,
    }
  } catch (error) {
    console.error(`Error getting database stats for ${dbConfig.name}:`, error)
    throw error
  } finally {
    await client.end()
  }
}

/**
 * Результат бэкапа одной БД
 */
export interface BackupResult {
  name: string
  success: boolean
  file?: string
  size?: number
  duration?: number
  error?: string
}

/**
 * Бэкап одной БД через pg_dump в контейнере
 * Значения dbConfig берутся из APP_CONFIG (hardcoded), безопасно для execSync
 */
export async function backupDatabase(dbConfig: DbConfig): Promise<BackupResult> {
  const startTime = Date.now()
  // Форматируем время в московской таймзоне
  const moscowTime = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Moscow' }).replace(/[: ]/g, '-')
  const filename = `${dbConfig.name}_${moscowTime}.sql.gz`
  const backupDir = '/home/deploy/letar/backups'
  const filepath = `${backupDir}/${filename}`

  try {
    // Импортируем Docker
    const { default: Docker } = await import('dockerode')
    const docker = new Docker({ socketPath: '/var/run/docker.sock' })

    // Находим контейнер PostgreSQL
    const containers = await docker.listContainers({ all: true })
    const pgContainer = containers.find((c) => c.Names.some((n) => n.includes(dbConfig.containerName)))

    if (!pgContainer) {
      return {
        name: dbConfig.name,
        success: false,
        error: `Container ${dbConfig.containerName} not found`,
      }
    }

    if (pgContainer.State !== 'running') {
      return {
        name: dbConfig.name,
        success: false,
        error: `Container ${dbConfig.containerName} is not running`,
      }
    }

    const container = docker.getContainer(pgContainer.Id)

    // Создаём exec для pg_dump | gzip
    const exec = await container.exec({
      Cmd: [
        'sh',
        '-c',
        `PGPASSWORD="${dbConfig.password}" pg_dump -U ${dbConfig.user} -d ${dbConfig.database} | gzip > /tmp/backup.sql.gz`,
      ],
      AttachStdout: true,
      AttachStderr: true,
    })

    // Запускаем exec
    const stream = await exec.start({ hijack: true, stdin: false })

    // Ждём завершения
    await new Promise<void>((resolve, reject) => {
      stream.on('end', resolve)
      stream.on('error', reject)
      // Таймаут 5 минут
      setTimeout(() => reject(new Error('Backup timeout')), 300000)
    })

    // Проверяем статус exec
    const execInfo = await exec.inspect()
    if (execInfo.ExitCode !== 0) {
      return {
        name: dbConfig.name,
        success: false,
        error: `pg_dump failed with exit code ${execInfo.ExitCode}`,
      }
    }

    // Копируем файл из контейнера на хост
    const { execSync } = await import('child_process')

    // Создаём директорию бэкапов если нет (значения hardcoded, безопасно)
    execSync(`mkdir -p ${backupDir}`, { stdio: 'ignore' })

    // Копируем из контейнера (containerId из Docker API, безопасно)
    execSync(`docker cp ${pgContainer.Id}:/tmp/backup.sql.gz ${filepath}`, { stdio: 'ignore' })

    // Удаляем временный файл в контейнере
    await container
      .exec({
        Cmd: ['rm', '-f', '/tmp/backup.sql.gz'],
      })
      .then((e) => e.start({ hijack: true, stdin: false }))

    // Получаем размер файла
    const { statSync } = await import('fs')
    const stats = statSync(filepath)

    const duration = Date.now() - startTime

    return {
      name: dbConfig.name,
      success: true,
      file: filename,
      size: stats.size,
      duration,
    }
  } catch (error) {
    return {
      name: dbConfig.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Бэкап всех БД
 */
export async function backupAllDatabases(): Promise<BackupResult[]> {
  const configs = getDbConfigs()

  const results = await Promise.all(configs.map((config) => backupDatabase(config)))

  return results
}

/**
 * Получение статистики всех БД
 */
export async function getAllDatabaseStats(filterDbName?: string): Promise<DatabaseStatsResult[]> {
  let configs = getDbConfigs()

  if (filterDbName) {
    configs = configs.filter((c) => c.name === filterDbName)
  }

  const stats = await Promise.all(
    configs.map(async (config) => {
      try {
        const dbStats = await getDatabaseStats(config)
        return {
          name: config.name,
          success: true,
          stats: dbStats,
        }
      } catch (error) {
        return {
          name: config.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  )

  return stats
}

/**
 * Информация о бэкапе
 */
export interface BackupInfo {
  id: string
  dbName: string
  filename: string
  path: string
  size: number
  createdAt: string
  type: 'manual' | 'auto'
}

/**
 * Получение списка бэкапов с файловой системы
 * Фильтрует по БД доступным на текущем сервере
 */
export async function getBackupsList(dbName?: string): Promise<BackupInfo[]> {
  const { readdir, stat } = await import('fs/promises')
  const path = await import('path')

  const backupsDir = '/home/deploy/letar/backups'

  try {
    const files = await readdir(backupsDir)

    // Получаем список доступных БД на этом сервере
    const availableDbNames = getAvailableAppNames()

    const backups: BackupInfo[] = []

    for (const filename of files) {
      // Только .sql.gz файлы
      if (!filename.endsWith('.sql.gz')) {
        continue
      }

      // Парсинг имени файла: dbname_type_timestamp.sql.gz
      const parts = filename.replace('.sql.gz', '').split('_')
      const db = parts[0]

      // Фильтрация по БД доступным на этом сервере
      if (!availableDbNames.includes(db as AppName)) {
        continue
      }

      // Фильтрация по конкретной БД если указана
      if (dbName && db !== dbName) {
        continue
      }

      const type = parts[1] === 'auto' || parts[1] === 'manual' ? parts[1] : 'manual'
      const filePath = path.join(backupsDir, filename)

      try {
        const stats = await stat(filePath)
        backups.push({
          id: filename,
          dbName: db,
          filename,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          type,
        })
      } catch {
        // Пропускаем файлы которые не можем прочитать
        continue
      }
    }

    // Сортировка по дате (новые сверху)
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return backups
  } catch (error) {
    console.error('Error getting backups list:', error)
    return []
  }
}
