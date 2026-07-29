/**
 * HTTP-клиент к dashboard-agent через SSH-туннель.
 *
 * Порт 3100 агента не публикуется в интернет (или будет закрыт) — ходим через
 * SSH-туннель `ssh -L <localPort>:localhost:3100 -N deploy@<host>` и обращаемся на
 * 127.0.0.1:<localPort>. Туннель поднимается лениво и переиспользуется.
 */

import type { InfraServer } from '@letar/infra-config'
import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { serverConnection, sshConfig, tokenForServer } from './config.js'

/** Проверяет, открыт ли локальный порт. */
function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const conn = createConnection({ port, host: '127.0.0.1' })
    conn.once('connect', () => {
      conn.destroy()
      resolvePort(true)
    })
    conn.once('error', () => resolvePort(false))
    conn.setTimeout(1000, () => {
      conn.destroy()
      resolvePort(false)
    })
  })
}

async function waitForPort(port: number, timeout = 15000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await isPortOpen(port)) {
      return true
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

// Какие серверы уже туннелированы в этом процессе
const tunnelled = new Set<InfraServer>()

/** Поднимает SSH-туннель к серверу, если ещё не поднят. */
async function ensureTunnel(server: InfraServer): Promise<void> {
  const { host, sshUser, hostPort, tunnelPort } = serverConnection(server)

  if (await isPortOpen(tunnelPort)) {
    tunnelled.add(server)
    return
  }

  const { exe, key } = sshConfig()
  spawn(
    exe,
    [
      '-i',
      key,
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'ServerAliveInterval=30',
      '-L',
      `${tunnelPort}:localhost:${hostPort}`,
      '-N',
      `${sshUser}@${host}`,
    ],
    { detached: true, stdio: 'ignore' }
  ).unref()

  if (!(await waitForPort(tunnelPort))) {
    throw new Error(
      `SSH-туннель к ${server} (${sshUser}@${host}) не поднялся за 15с. Проверь SSH-доступ и что агент слушает на хосте :${hostPort}.`
    )
  }
  tunnelled.add(server)
}

export interface AgentResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp?: string
}

export interface RequestOptions {
  method?: 'GET' | 'POST'
  path: string
  body?: unknown
  /** /health не требует авторизации */
  auth?: boolean
  timeoutMs?: number
}

/**
 * Запрос к агенту на сервере. Поднимает туннель, добавляет Bearer-токен, парсит JSON.
 * Бросает Error с диагностикой при сетевых/HTTP-ошибках — вызывающий tool оформит isError.
 */
export async function agentRequest<T = unknown>(
  server: InfraServer,
  { method = 'GET', path, body, auth = true, timeoutMs = 30000 }: RequestOptions
): Promise<AgentResponse<T>> {
  await ensureTunnel(server)
  const { tunnelPort } = serverConnection(server)

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    headers['Authorization'] = `Bearer ${tokenForServer(server)}`
  }

  let resp: Response
  try {
    resp = await fetch(`http://127.0.0.1:${tunnelPort}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Не удалось достучаться до агента на ${server} (туннель :${tunnelPort}): ${msg}`, {
      cause: err,
    })
  }

  if (resp.status === 401 || resp.status === 403) {
    throw new Error(`Агент на ${server} отклонил токен (HTTP ${resp.status}). Проверь AGENT_TOKEN в .env.docker.`)
  }

  const text = await resp.text()
  let json: AgentResponse<T>
  try {
    json = JSON.parse(text) as AgentResponse<T>
  } catch {
    throw new Error(`Агент на ${server} вернул не-JSON (HTTP ${resp.status}): ${text.slice(0, 200)}`)
  }
  return json
}
