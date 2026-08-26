/** Клиентский ключ идемпотентности одной попытки чекаута/покупки — паттерн монорепо,
 * см. `.claude/docs/client-idempotency-key-order-creation.md` (реализовано в apps/aboi, R6.12).
 *
 * Ключ генерируется в браузере (`crypto.randomUUID()`) и хранится в `sessionStorage`, а не в
 * памяти компонента — переживает reload/back той же вкладки, но не переживает закрытие вкладки
 * (короткоживущий "черновик попытки", не постоянный идентификатор). Один и тот же ключ на
 * повторных отправках одной формы гарантирует, что сервер (fast-path `findUnique` +
 * `try{create}catch` на `@unique`-нарушении) не создаст второй заказ из-за двойного клика или
 * повторной отправки после reload/back.
 *
 * `sessionStorage` может быть недоступен (приватный режим и т.п.) — читаем/пишем защищённо. */

export function getOrCreateIdempotencyKey(storageKey: string): string {
  try {
    const existing = sessionStorage.getItem(storageKey)
    if (existing) {
      return existing
    }
    const fresh = crypto.randomUUID()
    sessionStorage.setItem(storageKey, fresh)
    return fresh
  } catch {
    // sessionStorage недоступен — ключ не переживёт reload, но заказ всё равно оформится
    return crypto.randomUUID()
  }
}

/** Очищай после успешного завершения заказа/покупки — новая попытка должна получить новый ключ. */
export function clearIdempotencyKey(storageKey: string): void {
  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    // недоступно — нечего чистить
  }
}
