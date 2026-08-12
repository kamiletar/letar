/**
 * Конфигурация umami-mcp: URL панели Umami и креды логина (dashboard проксирует Umami API тем же
 * способом — POST /api/auth/login с username/password, см. apps/dashboard/src/app/api/analytics).
 *
 * UMAMI_API_URL/UMAMI_API_USER/UMAMI_API_PASSWORD сначала берутся из process.env, а если там
 * пусто — из apps/dashboard/.env.docker (тот же паттерн, что studio-time-mcp использует для
 * apps/studio/.env.local — см. libs/studio-time-mcp/src/config.ts).
 */

import { parseDotEnv } from '@letar/mcp-server-kit'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Корень репозитория (cli запускается из корня через `bunx tsx`). */
export const REPO_ROOT = process.env['UMAMI_MCP_REPO_ROOT'] ?? process.cwd()

let cachedDashboardEnv: Record<string, string> | null = null

/** apps/dashboard/.env.docker, распарсенный и закэшированный. */
function readDashboardEnv(): Record<string, string> {
  if (cachedDashboardEnv) {
    return cachedDashboardEnv
  }
  const path = resolve(REPO_ROOT, 'apps/dashboard/.env.docker')
  try {
    cachedDashboardEnv = parseDotEnv(readFileSync(path, 'utf8'))
  } catch {
    cachedDashboardEnv = {}
  }
  return cachedDashboardEnv
}

/** Базовый URL панели Umami. */
export function umamiUrl(): string {
  return process.env['UMAMI_API_URL'] ?? readDashboardEnv()['UMAMI_API_URL'] ?? 'https://stats.letar.best'
}

/** Логин администратора Umami. */
export function umamiUser(): string {
  return process.env['UMAMI_API_USER'] ?? readDashboardEnv()['UMAMI_API_USER'] ?? 'admin'
}

/** Пароль администратора Umami. */
export function umamiPassword(): string {
  const password = process.env['UMAMI_API_PASSWORD'] ?? readDashboardEnv()['UMAMI_API_PASSWORD']
  if (!password) {
    throw new Error(
      'UMAMI_API_PASSWORD не найден ни в process.env, ни в apps/dashboard/.env.docker. '
        + 'Для явной передачи задай UMAMI_API_PASSWORD через "env" в .mcp.json.',
    )
  }
  return password
}
