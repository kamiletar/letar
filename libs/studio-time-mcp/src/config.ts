/**
 * Конфигурация studio-time-mcp: URL studio API и служебный секрет (заголовок X-Time-Mcp-Secret).
 *
 * И STUDIO_URL, и TIME_MCP_SECRET сначала берутся из process.env, а если там пусто — из
 * apps/studio/.env.local (см. `.claude/hooks/lib/studio-time-env.js` — та же логика,
 * задублирована там для хуков, которые не могут импортировать этот TS-модуль напрямую).
 * По умолчанию .env.local целится в прод (studio.letar.best) — так время реальной работы над
 * клиентскими проектами не теряется в незапущенный dev-сервер. Для локального теста самого
 * тайм-трекера — временно переключить эти же две строки в .env.local на localhost:3024.
 */

import { parseDotEnv } from '@letar/mcp-server-kit'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Корень репозитория (cli запускается из корня через `bunx tsx`). */
export const REPO_ROOT = process.env['STUDIO_TIME_MCP_REPO_ROOT'] ?? process.cwd()

let cachedLocalEnv: Record<string, string> | null = null

/** apps/studio/.env.local, распарсенный и закэшированный. */
function readStudioLocalEnv(): Record<string, string> {
  if (cachedLocalEnv) {
    return cachedLocalEnv
  }
  const path = resolve(REPO_ROOT, 'apps/studio/.env.local')
  try {
    cachedLocalEnv = parseDotEnv(readFileSync(path, 'utf8'))
  } catch {
    cachedLocalEnv = {}
  }
  return cachedLocalEnv
}

/** Базовый URL studio API. */
export function studioUrl(): string {
  const fromEnv = process.env['STUDIO_URL']
  if (fromEnv) {
    return fromEnv
  }
  return readStudioLocalEnv()['STUDIO_URL'] ?? 'http://localhost:3024'
}

/** Служебный секрет для заголовка X-Time-Mcp-Secret. */
export function timeMcpSecret(): string {
  const fromEnv = process.env['TIME_MCP_SECRET']
  if (fromEnv) {
    return fromEnv
  }
  const secret = readStudioLocalEnv()['TIME_MCP_SECRET']
  if (!secret) {
    throw new Error(
      'TIME_MCP_SECRET не найден ни в process.env, ни в apps/studio/.env.local. '
        + 'Для не-локального STUDIO_URL задай TIME_MCP_SECRET явно (например через "env" в .mcp.json).',
    )
  }
  return secret
}
