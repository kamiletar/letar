/**
 * Shared Secret
 *
 * Общая проверка служебного секрета из заголовка запроса: сравнивает значение
 * заголовка с секретом из переменной окружения. Используется для эндпоинтов,
 * вызываемых доверенными процессами без пользовательской сессии (cron, MCP-серверы).
 */

/**
 * Возвращает true, если заголовок `options.header` запроса совпадает со значением
 * переменной окружения `options.envVar`. Секрет не задан в окружении → всегда false
 * (fail-closed).
 *
 * Принимает `Request` (обычные Route Handlers) или сырые `Headers` (better-auth
 * `createAuthEndpoint`, где `ctx.headers` — не полноценный `Request`).
 */
export function verifySharedSecret(source: Request | Headers, options: { envVar: string; header: string }): boolean {
  const secret = process.env[options.envVar]
  const headers = source instanceof Headers ? source : source.headers
  const provided = headers.get(options.header)

  return Boolean(secret) && provided === secret
}
