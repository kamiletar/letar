/**
 * Обёртка для повторных попыток при transient ошибках (сеть, IPC)
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 2000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === retries) {
        throw error
      }
      const delay = delayMs * (attempt + 1)
      console.warn(`[withRetry] Попытка ${attempt + 1}/${retries + 1} не удалась, повтор через ${delay}ms:`, error)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  // Недостижимо, но TypeScript требует
  throw new Error('withRetry: unreachable')
}
