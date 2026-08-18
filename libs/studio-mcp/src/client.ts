/**
 * Тонкий HTTP-клиент к studio API (/api/mcp/admin/*). Обычный fetch, без SSH-туннеля — studio API
 * либо локальный dev-сервер, либо публичный прод-домен. Копия структуры studio-time-mcp/client.ts
 * под другой заголовок/секрет (X-Admin-Mcp-Secret вместо X-Time-Mcp-Secret).
 */

import { adminMcpSecret, studioUrl } from './config.js'

export interface McpAdminResponse<T = unknown> {
  data?: T
  error?: unknown
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  /** Query-параметры — добавляются к path через URLSearchParams (пустые/undefined значения пропускаются). */
  query?: Record<string, string | undefined>
  timeoutMs?: number
}

export interface McpAdminResult<T = unknown> {
  ok: boolean
  status: number
  json: McpAdminResponse<T>
}

/**
 * Запрос к studio. Добавляет X-Admin-Mcp-Secret, парсит JSON. Бросает Error с диагностикой при
 * сетевых ошибках/невалидном JSON — вызывающий tool оформит isError. HTTP-ошибки (4xx/5xx с
 * валидным JSON-телом `{ error }`) НЕ бросают — возвращаются как `ok: false` для читаемого
 * сообщения агенту (например 404 «клиент не найден» — это ожидаемый, не исключительный случай).
 */
export async function studioAdminRequest<T = unknown>({
  method = 'GET',
  path,
  body,
  query,
  timeoutMs = 15000,
}: RequestOptions): Promise<McpAdminResult<T>> {
  const qs = query
    ? new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])))
      .toString()
    : ''
  const url = `${studioUrl()}${path}${qs ? `?${qs}` : ''}`

  let resp: Response
  try {
    resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Mcp-Secret': adminMcpSecret() },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Не удалось достучаться до studio (${url}): ${msg}`, { cause: err })
  }

  const raw = await resp.text()
  let json: McpAdminResponse<T>
  try {
    json = raw ? (JSON.parse(raw) as McpAdminResponse<T>) : {}
  } catch {
    throw new Error(`studio вернул не-JSON (HTTP ${resp.status}) на ${path}: ${raw.slice(0, 200)}`)
  }

  return { ok: resp.ok, status: resp.status, json }
}
