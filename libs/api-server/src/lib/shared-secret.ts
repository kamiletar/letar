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
 */
export function verifySharedSecret(request: Request, options: { envVar: string; header: string }): boolean {
  const secret = process.env[options.envVar]
  const provided = request.headers.get(options.header)

  return Boolean(secret) && provided === secret
}
