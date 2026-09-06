/**
 * Ограничитель параллельных операций (простая реализация p-limit)
 *
 * Вынесен из services/import/helpers.ts — используется не только демуксом,
 * но и IPFS-слоем (services/ipfs), у которого нет причин зависеть от import-домена.
 */
export function createConcurrencyLimiter(concurrency: number) {
  const queue: Array<() => void> = []
  let activeCount = 0

  const next = () => {
    if (queue.length > 0 && activeCount < concurrency) {
      activeCount++
      const fn = queue.shift()
      if (fn) {
        fn()
      }
    }
  }

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          activeCount--
          next()
        }
      }

      queue.push(run)
      next()
    })
  }
}
