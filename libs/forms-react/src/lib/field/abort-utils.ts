/** Отказ из-за отмены запроса (`AbortController`) — не ошибка загрузки */
export function isAbortError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && (error as { name?: unknown }).name === 'AbortError'
}

/** Вызов загрузчика с приведением синхронного `throw` к отказу промиса */
export function callLoader<TResult>(load: () => Promise<TResult>): Promise<TResult> {
  try {
    return load()
  } catch (error) {
    return Promise.reject(error)
  }
}
