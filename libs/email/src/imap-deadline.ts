/**
 * Обёртка для любой операции над `ImapFlow`, гарантирующая возврат за конечное время.
 *
 * См. `.claude/docs/imapflow-error-listener-hang-pitfall.md`: `ImapFlow` эмитит `'error'`
 * асинхронно при обрыве/таймауте сокета — не всегда как reject уже начатого `await`, а иногда
 * ВМЕСТО него. Слушателя на `'error'` достаточно, чтобы не уронить процесс необработанным
 * событием на `EventEmitter`, но недостаточно, чтобы гарантировать возврат из зависшего `await`.
 * Единственная надёжная защита — внешний `Promise.race` с жёстким дедлайном и безусловный
 * `client.close()` после гонки.
 */

import type { ImapFlow } from 'imapflow'

/**
 * @param client Уже созданный (но ещё не подключённый) клиент — сюда навешивается слушатель `'error'`.
 * @param work Основная операция. Получает `getClientError()` для проверки ошибки между IMAP-командами —
 *   это даёт более быстрый и точный выход, чем ожидание дедлайна, но не заменяет его.
 * @param opts.timeoutMs Жёсткий дедлайн — по истечении `work` больше не ждём, вызывающий код
 *   получает результат `onTimeout`.
 * @param opts.onTimeout Строит безопасный дефолтный результат при срабатывании дедлайна.
 *   Получает последнюю известную ошибку клиента (если она подоспела раньше таймера).
 */
export async function withImapDeadline<T>(
  client: ImapFlow,
  work: (getClientError: () => Error | null) => Promise<T>,
  opts: {
    timeoutMs: number
    onTimeout: (clientError: Error | null) => T
  },
): Promise<T> {
  let clientError: Error | null = null
  client.on('error', (error: unknown) => {
    clientError = error instanceof Error ? error : new Error(String(error))
  })

  const result = await Promise.race([
    work(() => clientError),
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(opts.onTimeout(clientError)), opts.timeoutMs)
    }),
  ])

  // Гасим соединение жёстко (не `logout()`) — если гонка выиграна таймаутом, штатный logout
  // внутри `work` мог не выполниться (или тоже зависнуть на мёртвом сокете).
  client.close()

  return result
}
