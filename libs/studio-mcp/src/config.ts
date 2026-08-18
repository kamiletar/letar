/**
 * Конфигурация studio-mcp: URL studio API и служебный секрет (заголовок X-Admin-Mcp-Secret).
 *
 * И STUDIO_URL, и ADMIN_MCP_SECRET сначала берутся из process.env, а если там пусто — из
 * apps/studio/.env.local. По умолчанию .env.local целится в прод (studio.letar.best) — тот же
 * приём, что и у libs/studio-time-mcp (см. её config.ts), намеренно задублирован здесь, а не
 * вынесен в общий хелпер: два разных секрета (TIME_MCP_SECRET/ADMIN_MCP_SECRET) с разным
 * периметром доверия не должны читаться одной функцией.
 */

import { parseDotEnv } from '@letar/mcp-server-kit'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Корень репозитория (cli запускается из корня через `bunx tsx`). */
export const REPO_ROOT = process.env['STUDIO_MCP_REPO_ROOT'] ?? process.cwd()

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

/** Служебный секрет для заголовка X-Admin-Mcp-Secret. */
export function adminMcpSecret(): string {
  const fromEnv = process.env['ADMIN_MCP_SECRET']
  if (fromEnv) {
    return fromEnv
  }
  const secret = readStudioLocalEnv()['ADMIN_MCP_SECRET']
  if (!secret) {
    throw new Error(
      'ADMIN_MCP_SECRET не найден ни в process.env, ни в apps/studio/.env.local. '
        + 'Для не-локального STUDIO_URL задай ADMIN_MCP_SECRET явно (например через "env" в .mcp.json).',
    )
  }
  return secret
}
