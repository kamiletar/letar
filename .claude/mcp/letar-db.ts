#!/usr/bin/env bun
/**
 * letar-db — единый MCP-сервер для всех Postgres-баз монорепо.
 *
 * Раньше — 8 отдельных stdio-процессов (.claude/mcp/pg-wrapper.mjs), 3 из них поднимали Python
 * (uvx postgres-mcp) ради Pro-инструментов (EXPLAIN/health-check/подбор индексов), которые за
 * всю историю вызывались ~9 раз и регулярно не укладывались в 30-секундный таймаут подключения.
 * Теперь один процесс, три простых инструмента (dbs/sql/schema), без Python.
 *
 * Реестр баз — .claude/mcp/databases.json (без секретов, только пути к env-файлам). Новую базу
 * добавляешь записью в JSON — реестр перечитывается при каждом вызове, рестарт сессии не нужен.
 *
 * Запуск: bun .claude/mcp/letar-db.ts (см. .mcp.json), cwd — корень репозитория.
 */
import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { z } from 'zod'

import { parsePostgresUrl } from '../../libs/pg-url/src/lib/feature.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
// cwd у stdio-процесса — корень репозитория (см. .mcp.json), но не полагаемся на это неявно —
// резолвим от расположения самого файла, как это делают apps/synth и apps/domwellbes cli.ts.
const REPO_ROOT = resolve(__dirname, '..', '..')
const REGISTRY_PATH = resolve(__dirname, 'databases.json')

type DbMode = 'rw' | 'ro'

interface DbTunnelConfig {
  localPort: number
  sshHost: string
  remotePort: number
}

interface DbConfig {
  name: string
  envFile: string
  urlVar?: string
  mode: DbMode
  tunnel?: DbTunnelConfig
}

function loadRegistry(): DbConfig[] {
  const raw = readFileSync(REGISTRY_PATH, 'utf8')
  const parsed = JSON.parse(raw) as { databases: DbConfig[] }
  return parsed.databases
}

function findDbConfig(name: string): DbConfig {
  const cfg = loadRegistry().find((d) => d.name === name)
  if (!cfg) {
    const names = loadRegistry().map((d) => d.name).join(', ')
    throw new Error(`Неизвестная база "${name}". Доступные: ${names}`)
  }
  return cfg
}

// ─── Парсинг .env-файла (перенесено из pg-wrapper.mjs, без изменений в логике) ───

function parseEnvFile(path: string): Record<string, string> {
  const content = readFileSync(path, 'utf8')
  const env: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) {
      continue
    }
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

// ─── SSH-туннель (перенесено из pg-wrapper.mjs) ───

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const conn = createConnection({ port, host: '127.0.0.1' })
    conn.once('connect', () => {
      conn.destroy()
      resolvePromise(true)
    })
    conn.once('error', () => resolvePromise(false))
    conn.setTimeout(1000, () => {
      conn.destroy()
      resolvePromise(false)
    })
  })
}

async function waitForPort(port: number, timeoutMs = 10_000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) {
      return true
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

const tunnelsEnsured = new Set<number>()

async function ensureTunnel(tunnel: DbTunnelConfig): Promise<void> {
  if (tunnelsEnsured.has(tunnel.localPort)) {
    return
  }
  // Порт мог поднять уже другой процесс/сессия раньше нас — тогда просто переиспользуем.
  if (await isPortOpen(tunnel.localPort)) {
    tunnelsEnsured.add(tunnel.localPort)
    return
  }
  const sshExe = 'C:\\Windows\\System32\\OpenSSH\\ssh.exe'
  const sshKey = `${process.env['USERPROFILE']}\\.ssh\\id_rsa`
  spawn(
    sshExe,
    [
      '-i',
      sshKey,
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'ServerAliveInterval=30',
      '-L',
      `${tunnel.localPort}:localhost:${tunnel.remotePort}`,
      '-N',
      tunnel.sshHost,
    ],
    { detached: true, stdio: 'ignore' },
  ).unref()

  const ok = await waitForPort(tunnel.localPort)
  if (!ok) {
    throw new Error(`SSH-туннель не поднялся за 10 сек (порт ${tunnel.localPort})`)
  }
  tunnelsEnsured.add(tunnel.localPort)
}

// ─── Типы: timestamp/timestamptz/date отдаём сырым текстом, без сдвига TZ ───
// (см. память reference_postgres_mcp_tz_display.md — старые postgres-* MCP этим страдали)
pg.types.setTypeParser(1082, (v: string) => v) // date
pg.types.setTypeParser(1114, (v: string) => v) // timestamp without time zone
pg.types.setTypeParser(1184, (v: string) => v) // timestamptz

// ─── Пулы подключений (лениво, один на базу) ───

const pools = new Map<string, pg.Pool>()

async function getPool(cfg: DbConfig): Promise<pg.Pool> {
  const existing = pools.get(cfg.name)
  if (existing) {
    return existing
  }
  if (cfg.tunnel) {
    await ensureTunnel(cfg.tunnel)
  }
  const envPath = resolve(REPO_ROOT, cfg.envFile)
  const env = parseEnvFile(envPath)
  const urlVar = cfg.urlVar ?? 'DATABASE_URL'
  const dbUrl = env[urlVar]
  if (!dbUrl) {
    throw new Error(`Переменная ${urlVar} не найдена в ${cfg.envFile}`)
  }
  const parsed = parsePostgresUrl(dbUrl)
  const pool = new pg.Pool({
    user: parsed.user,
    password: parsed.password,
    host: parsed.host,
    port: parsed.port,
    database: parsed.database,
    max: 3,
    connectionTimeoutMillis: 10_000,
  })
  pools.set(cfg.name, pool)
  return pool
}

const MAX_ROWS = 500

async function runSql(cfg: DbConfig, sql: string, timeoutMs: number) {
  const pool = await getPool(cfg)

  if (cfg.mode === 'ro') {
    const client = await pool.connect()
    try {
      await client.query(`SET statement_timeout = ${timeoutMs}`)
      await client.query('BEGIN TRANSACTION READ ONLY')
      try {
        const result = await client.query(sql)
        return result
      } finally {
        await client.query('ROLLBACK').catch(() => {})
      }
    } finally {
      client.release()
    }
  }

  // rw: без обёртки транзакцией — некоторые операции (CREATE INDEX CONCURRENTLY, VACUUM)
  // вообще не могут выполняться внутри транзакционного блока.
  const client = await pool.connect()
  try {
    await client.query(`SET statement_timeout = ${timeoutMs}`)
    return await client.query(sql)
  } finally {
    client.release()
  }
}

function formatRows(result: { rows: unknown[]; rowCount: number | null; command: string }): string {
  const truncated = result.rows.length > MAX_ROWS
  const rows = truncated ? result.rows.slice(0, MAX_ROWS) : result.rows
  const payload = {
    command: result.command,
    rowCount: result.rowCount,
    rows,
    ...(truncated ? { truncated: true, shown: MAX_ROWS, total: result.rows.length } : {}),
  }
  return JSON.stringify(payload, null, 2)
}

// ─── MCP-сервер ───

const server = new McpServer({ name: '@letar/letar-db', version: '1.0.0' }, { capabilities: { tools: {} } })

server.registerTool(
  'dbs',
  {
    description: 'Список зарегистрированных Postgres-баз: имя, режим (rw/ro), поднят ли туннель.',
    inputSchema: {},
  },
  async () => {
    const registry = loadRegistry()
    const rows = await Promise.all(
      registry.map(async (cfg) => ({
        name: cfg.name,
        mode: cfg.mode,
        tunnel: cfg.tunnel
          ? { localPort: cfg.tunnel.localPort, up: await isPortOpen(cfg.tunnel.localPort) }
          : undefined,
      })),
    )
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] }
  },
)

server.registerTool(
  'sql',
  {
    description: 'Выполняет SQL на указанной базе. На ro-базах — всегда в READ ONLY транзакции '
      + '(ROLLBACK в конце, писать нельзя в принципе). На rw — как есть, без обёртки транзакцией '
      + '(нужно для CREATE INDEX CONCURRENTLY / VACUUM). Вывод обрезается до 500 строк. '
      + 'Список баз — инструмент dbs.',
    inputSchema: {
      db: z.string().min(1).describe('Имя базы из dbs, например "domwellbes" или "kami-prod"'),
      sql: z.string().min(1).describe('SQL-запрос, включая EXPLAIN — отдельного инструмента нет'),
      timeoutMs: z.number().int().min(1000).max(120_000).default(30_000).describe('statement_timeout'),
    },
  },
  async ({ db, sql, timeoutMs }) => {
    let cfg: DbConfig
    try {
      cfg = findDbConfig(db)
    } catch (err) {
      return { content: [{ type: 'text', text: (err as Error).message }], isError: true }
    }
    try {
      const result = await runSql(cfg, sql, timeoutMs)
      return { content: [{ type: 'text', text: formatRows(result) }] }
    } catch (err) {
      return { content: [{ type: 'text', text: `Ошибка запроса: ${(err as Error).message}` }], isError: true }
    }
  },
)

server.registerTool(
  'schema',
  {
    description: 'Без table — список таблиц публичной схемы. С table — колонки (имя/тип/nullable) и индексы.',
    inputSchema: {
      db: z.string().min(1).describe('Имя базы из dbs'),
      table: z.string().min(1).optional().describe('Имя таблицы — без него вернётся список всех таблиц'),
    },
  },
  async ({ db, table }) => {
    let cfg: DbConfig
    try {
      cfg = findDbConfig(db)
    } catch (err) {
      return { content: [{ type: 'text', text: (err as Error).message }], isError: true }
    }
    try {
      if (!table) {
        const result = await runSql(
          cfg,
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
          10_000,
        )
        return { content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }] }
      }
      const columns = await runSql(
        cfg,
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = '${table.replace(/'/g, "''")}'
         ORDER BY ordinal_position`,
        10_000,
      )
      const indexes = await runSql(
        cfg,
        `SELECT indexname, indexdef FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = '${table.replace(/'/g, "''")}'`,
        10_000,
      )
      return {
        content: [{ type: 'text', text: JSON.stringify({ columns: columns.rows, indexes: indexes.rows }, null, 2) }],
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Ошибка: ${(err as Error).message}` }], isError: true }
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
