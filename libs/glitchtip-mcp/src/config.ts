/**
 * Конфигурация glitchtip-mcp: URL self-hosted GlitchTip (errors.s3.letar.best), org slug и
 * read-only Auth Token (Settings → Auth Tokens в GlitchTip UI, права project:read + event:read).
 *
 * GLITCHTIP_BASE_URL/GLITCHTIP_ORG/GLITCHTIP_API_TOKEN сначала берутся из process.env, а если там
 * пусто — из infra/glitchtip/.env.local (тот же паттерн, что studio-time-mcp использует для
 * apps/studio/.env.local, см. libs/studio-time-mcp/src/config.ts). Токен создаётся только через
 * GlitchTip UI (сессионный логин) — API не даёт токену создавать другие токены, см.
 * infra/glitchtip/README.md.
 */

import { parseDotEnv } from '@letar/mcp-server-kit'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Корень репозитория (cli запускается из корня через `bunx tsx`). */
export const REPO_ROOT = process.env['GLITCHTIP_MCP_REPO_ROOT'] ?? process.cwd()

let cachedLocalEnv: Record<string, string> | null = null

/** infra/glitchtip/.env.local, распарсенный и закэшированный. */
function readLocalEnv(): Record<string, string> {
  if (cachedLocalEnv) {
    return cachedLocalEnv
  }
  const path = resolve(REPO_ROOT, 'infra/glitchtip/.env.local')
  try {
    cachedLocalEnv = parseDotEnv(readFileSync(path, 'utf8'))
  } catch {
    cachedLocalEnv = {}
  }
  return cachedLocalEnv
}

/** Базовый URL self-hosted GlitchTip. */
export function glitchtipUrl(): string {
  return process.env['GLITCHTIP_BASE_URL'] ?? readLocalEnv()['GLITCHTIP_BASE_URL'] ?? 'https://errors.s3.letar.best'
}

/** Org slug в GlitchTip. */
export function glitchtipOrg(): string {
  const org = process.env['GLITCHTIP_ORG'] ?? readLocalEnv()['GLITCHTIP_ORG']
  if (!org) {
    throw new Error(
      'GLITCHTIP_ORG не найден ни в process.env, ни в infra/glitchtip/.env.local. '
        + 'Значение — slug организации в GlitchTip UI (тот же, что в URL дашборда).',
    )
  }
  return org
}

/** Auth Token GlitchTip (Bearer). */
export function glitchtipToken(): string {
  const token = process.env['GLITCHTIP_API_TOKEN'] ?? readLocalEnv()['GLITCHTIP_API_TOKEN']
  if (!token) {
    throw new Error(
      'GLITCHTIP_API_TOKEN не найден ни в process.env, ни в infra/glitchtip/.env.local. '
        + 'Создай в GlitchTip UI → Settings → Auth Tokens (project:read + event:read).',
    )
  }
  return token
}
