/**
 * Тонкий HTTP-клиент к studio API (/api/mcp/time/*). Обычный fetch, без SSH-туннеля — в отличие
 * от deploy-mcp, studio API либо локальный dev-сервер, либо публичный прод-домен.
 */

import { studioUrl, timeMcpSecret } from './config.js'

export interface McpTimeResponse<T = unknown> {
  data?: T
  error?: unknown
}

export interface RequestOptions {
  method?: 'GET' | 'POST'
  path: string
  body?: unknown
  timeoutMs?: number
}

export interface McpTimeResult<T = unknown> {
  ok: boolean
  status: number
  json: McpTimeResponse<T>
}

/**
 * Запрос к studio. Добавляет X-Time-Mcp-Secret, парсит JSON. Бросает Error с диагностикой при
 * сетевых ошибках/невалидном JSON — вызывающий tool оформит isError. HTTP-ошибки (4xx/5xx с
 * валидным JSON-телом `{ error }`) НЕ бросают — возвращаются как `ok: false` для читаемого
 * сообщения агенту (например 404 «проект не найден» — это ожидаемый, не исключительный случай).
 */
export async function studioTimeRequest<T = unknown>(
  { method = 'GET', path, body, timeoutMs = 15000 }: RequestOptions,
): Promise<McpTimeResult<T>> {
  const url = `${studioUrl()}${path}`

  let resp: Response
  try {
    resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Time-Mcp-Secret': timeMcpSecret() },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Не удалось достучаться до studio (${url}): ${msg}`, { cause: err })
  }

  const raw = await resp.text()
  let json: McpTimeResponse<T>
  try {
    json = raw ? (JSON.parse(raw) as McpTimeResponse<T>) : {}
  } catch {
    throw new Error(`studio вернул не-JSON (HTTP ${resp.status}) на ${path}: ${raw.slice(0, 200)}`)
  }

  return { ok: resp.ok, status: resp.status, json }
}
