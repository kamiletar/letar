/**
 * Тонкий HTTP-клиент к studio API (/api/mcp/time/*). Обёртка над `createSecretHttpClient` из
 * @letar/mcp-server-kit — общей fetch-обёрткой с секретным заголовком, таймаутом и различением
 * сетевой/JSON-ошибки от HTTP 4xx/5xx с валидным телом. В отличие от deploy-mcp, studio API либо
 * локальный dev-сервер, либо публичный прод-домен — без SSH-туннеля.
 */

import { createSecretHttpClient } from '@letar/mcp-server-kit'
import { studioUrl, timeMcpSecret } from './config.js'

export interface McpTimeResponse<T = unknown> {
  data?: T
  error?: unknown
  /** Стоп-кран (§11.15 PLAN.md studio): просрочка оплаты клиентом — только в ответе time_start/time_switch */
  warning?: string | null
}

export type { SecretHttpRequestOptions as RequestOptions } from '@letar/mcp-server-kit'

export interface McpTimeResult<T = unknown> {
  ok: boolean
  status: number
  json: McpTimeResponse<T>
}

const request = createSecretHttpClient({
  baseUrl: studioUrl,
  secretHeaderName: 'X-Time-Mcp-Secret',
  secret: timeMcpSecret,
  serviceLabel: 'studio',
})

/**
 * Запрос к studio. Добавляет X-Time-Mcp-Secret, парсит JSON. Бросает Error с диагностикой при
 * сетевых ошибках/невалидном JSON — вызывающий tool оформит isError. HTTP-ошибки (4xx/5xx с
 * валидным JSON-телом `{ error }`) НЕ бросают — возвращаются как `ok: false` для читаемого
 * сообщения агенту (например 404 «проект не найден» — это ожидаемый, не исключительный случай).
 */
export function studioTimeRequest<T = unknown>(
  options: Parameters<typeof request>[0],
): Promise<McpTimeResult<T>> {
  return request<McpTimeResponse<T>>(options)
}
