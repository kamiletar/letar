/**
 * Тонкий HTTP-клиент к studio API (/api/mcp/admin/*). Обёртка над `createSecretHttpClient` из
 * @letar/mcp-server-kit — общей fetch-обёрткой с секретным заголовком, таймаутом и различением
 * сетевой/JSON-ошибки от HTTP 4xx/5xx с валидным телом. Копия структуры studio-time-mcp/client.ts
 * под другой заголовок/секрет (X-Admin-Mcp-Secret вместо X-Time-Mcp-Secret).
 */

import { createSecretHttpClient } from '@letar/mcp-server-kit'
import { adminMcpSecret, studioUrl } from './config.js'

export interface McpAdminResponse<T = unknown> {
  data?: T
  error?: unknown
}

export type { SecretHttpRequestOptions as RequestOptions } from '@letar/mcp-server-kit'

export interface McpAdminResult<T = unknown> {
  ok: boolean
  status: number
  json: McpAdminResponse<T>
}

const request = createSecretHttpClient({
  baseUrl: studioUrl,
  secretHeaderName: 'X-Admin-Mcp-Secret',
  secret: adminMcpSecret,
  serviceLabel: 'studio',
})

/**
 * Запрос к studio. Добавляет X-Admin-Mcp-Secret, парсит JSON. Бросает Error с диагностикой при
 * сетевых ошибках/невалидном JSON — вызывающий tool оформит isError. HTTP-ошибки (4xx/5xx с
 * валидным JSON-телом `{ error }`) НЕ бросают — возвращаются как `ok: false` для читаемого
 * сообщения агенту (например 404 «клиент не найден» — это ожидаемый, не исключительный случай).
 */
export function studioAdminRequest<T = unknown>(
  options: Parameters<typeof request>[0],
): Promise<McpAdminResult<T>> {
  return request<McpAdminResponse<T>>(options)
}
