/**
 * Конфигурация studio-time-mcp: URL studio API и служебный секрет (заголовок X-Time-Mcp-Secret).
 *
 * По умолчанию бьёт в локальный dev-сервер studio (`http://localhost:3024`) и читает
 * TIME_MCP_SECRET из apps/studio/.env.local — типичный случай: агент трекает время локальной
 * рабочей сессии. Для другого таргета (прод/staging) — переопредели STUDIO_URL и TIME_MCP_SECRET
 * через переменные окружения процесса (например через "env" в .mcp.json, как у letar-consultant).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Корень репозитория (cli запускается из корня через `bunx tsx`). */
export const REPO_ROOT = process.env['STUDIO_TIME_MCP_REPO_ROOT'] ?? process.cwd()

/** Парсит dotenv-содержимое в объект (кавычки снимаются). */
function parseEnv(content: string): Record<string, string> {
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

let cachedLocalEnv: Record<string, string> | null = null

/** apps/studio/.env.local, распарсенный и закэшированный. */
function readStudioLocalEnv(): Record<string, string> {
  if (cachedLocalEnv) {
    return cachedLocalEnv
  }
  const path = resolve(REPO_ROOT, 'apps/studio/.env.local')
  try {
    cachedLocalEnv = parseEnv(readFileSync(path, 'utf8'))
  } catch {
    cachedLocalEnv = {}
  }
  return cachedLocalEnv
}

/** Базовый URL studio API. */
export function studioUrl(): string {
  return process.env['STUDIO_URL'] ?? 'http://localhost:3024'
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
