#!/usr/bin/env node
/**
 * Конфигурация для time-heartbeat.js/time-stop-check.js: STUDIO_URL + TIME_MCP_SECRET.
 *
 * Приоритет — как в libs/studio-time-mcp/src/config.ts (не может импортировать тот TS-модуль
 * напрямую — хуки запускаются голым `node`, без сборки): process.env, иначе
 * apps/studio/.env.local. Дублирование логики parseDotEnv из libs/mcp-server-kit — сознательно,
 * хуки в этом репозитории без внешних зависимостей.
 */

const fs = require('fs')
const path = require('path')

function parseDotEnv(content) {
  const env = {}
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

let cachedLocalEnv = null

function readStudioLocalEnv() {
  if (cachedLocalEnv) {
    return cachedLocalEnv
  }
  const repoRoot = process.env.STUDIO_TIME_MCP_REPO_ROOT || path.resolve(__dirname, '..', '..', '..')
  const envPath = path.join(repoRoot, 'apps', 'studio', '.env.local')
  try {
    cachedLocalEnv = parseDotEnv(fs.readFileSync(envPath, 'utf8'))
  } catch {
    cachedLocalEnv = {}
  }
  return cachedLocalEnv
}

/** { studioUrl, secret } — secret может быть undefined, если не задан нигде. */
function getStudioTimeConfig() {
  const local = readStudioLocalEnv()
  const studioUrl = process.env.STUDIO_URL || local.STUDIO_URL || 'http://localhost:3024'
  const secret = process.env.TIME_MCP_SECRET || local.TIME_MCP_SECRET
  return { studioUrl, secret }
}

module.exports = { getStudioTimeConfig }
