/**
 * Конфигурация deploy-mcp: адреса серверов, локальные порты SSH-туннелей, токены.
 *
 * Токен агента (AGENT_TOKEN) НЕ хранится в .mcp.json — читается из
 * apps/dashboard-agent/.env.docker (или расшифровывается из .env.docker.enc через SOPS),
 * по аналогии с .claude/mcp/pg-wrapper.mjs.
 */

import { type InfraServer, SERVERS } from '@letar/infra-config'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Корень репозитория (cli запускается из корня через `bunx tsx`). */
export const REPO_ROOT = process.env['DEPLOY_MCP_REPO_ROOT'] ?? process.cwd()

/** Локальные порты SSH-туннелей на каждый сервер (форвардятся на hostPort сервера). */
export const TUNNEL_PORTS: Record<InfraServer, number> = {
  s2: 13100,
  s3: 13101,
}

/** SSH-ключ и бинарь в зависимости от платформы (Windows — полный путь к ssh.exe). */
export function sshConfig(): { exe: string; key: string } {
  if (process.platform === 'win32') {
    return {
      exe: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe',
      key: `${process.env['USERPROFILE']}\\.ssh\\id_rsa`,
    }
  }
  return { exe: 'ssh', key: `${process.env['HOME']}/.ssh/id_rsa` }
}

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

/**
 * Читает env-переменные dashboard-agent: plaintext .env.docker, иначе расшифровка
 * .env.docker.enc через sops (нужен SOPS_AGE_KEY_FILE). Результат кешируется.
 */
let cachedEnv: Record<string, string> | null = null
function readAgentEnv(): Record<string, string> {
  if (cachedEnv) {
    return cachedEnv
  }
  const dir = resolve(REPO_ROOT, 'apps/dashboard-agent')
  const plain = resolve(dir, '.env.docker')
  const enc = resolve(dir, '.env.docker.enc')

  if (existsSync(plain)) {
    cachedEnv = parseEnv(readFileSync(plain, 'utf8'))
    return cachedEnv
  }
  if (existsSync(enc)) {
    if (!process.env['SOPS_AGE_KEY_FILE'] && !process.env['SOPS_AGE_KEY']) {
      throw new Error(
        `Найден ${enc}, но не задан SOPS_AGE_KEY_FILE. Установи путь к age-ключу либо положи расшифрованный .env.docker.`,
      )
    }
    const out = execFileSync('sops', ['-d', '--input-type', 'dotenv', '--output-type', 'dotenv', enc], {
      encoding: 'utf8',
    })
    cachedEnv = parseEnv(out)
    return cachedEnv
  }
  throw new Error(
    `Не найден ни apps/dashboard-agent/.env.docker, ни .env.docker.enc в ${dir}. Токен агента прочитать неоткуда.`,
  )
}

/**
 * Bearer-токен для сервера. s3 (staging) использует отдельный AGENT_TOKEN_S3, если задан;
 * иначе падает на AGENT_TOKEN (с оговоркой — на s3 должен быть свой токен, см. plan).
 */
export function tokenForServer(server: InfraServer): string {
  const env = readAgentEnv()
  if (server === 's3') {
    const s3 = env['AGENT_TOKEN_S3']
    if (s3) {
      return s3
    }
  }
  const token = env['AGENT_TOKEN']
  if (!token) {
    throw new Error('AGENT_TOKEN не найден в .env.docker dashboard-agent.')
  }
  return token
}

/** Текущий HEAD локального репозитория (для сверки с коммитом, на котором прогонялся e2e). */
export function localHeadSha(): string {
  return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
}

/** Базовые данные подключения к агенту на сервере. */
export function serverConnection(server: InfraServer): {
  host: string
  sshUser: string
  /** Порт на хосте сервера — цель SSH-туннеля (может ≠ порту контейнера, см. hostPort). */
  hostPort: number
  /** Локальный порт SSH-туннеля на этой машине. */
  tunnelPort: number
} {
  const info = SERVERS[server]
  return {
    host: info.host,
    sshUser: info.sshUser,
    hostPort: info.hostPort,
    tunnelPort: TUNNEL_PORTS[server],
  }
}
