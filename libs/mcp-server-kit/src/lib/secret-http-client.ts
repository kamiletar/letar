/**
 * Общая fetch-обёртка для тонких MCP-клиентов вида `libs/studio-mcp`/`libs/studio-time-mcp`:
 * секретный HTTP-заголовок, таймаут через AbortController, различение сетевой/JSON-parse ошибки
 * (throw) от HTTP 4xx/5xx с валидным JSON-телом (возврат `{ ok: false, ... }`).
 */

export interface SecretHttpClientOptions {
  /** Базовый URL сервиса — функция, а не строка: значение может читаться лениво из env/файла. */
  baseUrl: () => string
  /** Имя HTTP-заголовка с секретом, например `X-Admin-Mcp-Secret`. */
  secretHeaderName: string
  /** Секрет — функция, а не строка: может бросать при отсутствии конфигурации. */
  secret: () => string
  /** Название сервиса для текста ошибок (по умолчанию «сервис»). */
  serviceLabel?: string
  timeoutMs?: number
}

export interface SecretHttpRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  /** Query-параметры — добавляются к path через URLSearchParams (пустые/undefined значения пропускаются). */
  query?: Record<string, string | undefined>
  timeoutMs?: number
}

export interface SecretHttpResult<T = unknown> {
  ok: boolean
  status: number
  json: T
}

/**
 * Создаёт функцию запроса к сервису, защищённому секретным заголовком. Бросает Error с
 * диагностикой при сетевых ошибках/невалидном JSON. HTTP-ошибки (4xx/5xx с валидным JSON-телом)
 * НЕ бросают — возвращаются как `ok: false`, чтобы вызывающий код мог отдать читаемое сообщение
 * (например 404 «не найден» — это ожидаемый, не исключительный случай).
 */
export function createSecretHttpClient(options: SecretHttpClientOptions) {
  const { baseUrl, secretHeaderName, secret, serviceLabel = 'сервис', timeoutMs: defaultTimeoutMs = 15000 } = options

  return async function secretHttpRequest<T = unknown>({
    method = 'GET',
    path,
    body,
    query,
    timeoutMs = defaultTimeoutMs,
  }: SecretHttpRequestOptions): Promise<SecretHttpResult<T>> {
    const qs = query
      ? new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])))
        .toString()
      : ''
    const url = `${baseUrl()}${path}${qs ? `?${qs}` : ''}`

    let resp: Response
    try {
      resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', [secretHeaderName]: secret() },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Не удалось достучаться до ${serviceLabel} (${url}): ${msg}`, { cause: err })
    }

    const raw = await resp.text()
    let json: T
    try {
      json = raw ? (JSON.parse(raw) as T) : ({} as T)
    } catch {
      throw new Error(`${serviceLabel} вернул не-JSON (HTTP ${resp.status}) на ${path}: ${raw.slice(0, 200)}`)
    }

    return { ok: resp.ok, status: resp.status, json }
  }
}
