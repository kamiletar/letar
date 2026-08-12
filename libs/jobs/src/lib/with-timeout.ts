/**
 * Оборачивает промис таймаутом — обработчик задачи не должен виснуть бесконечно и блокировать
 * воркер pg-boss. Отдельный файл ради unit-теста без поднятия pg-boss.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Задача "${label}" превысила таймаут ${timeoutMs}мс`)),
      timeoutMs,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}
