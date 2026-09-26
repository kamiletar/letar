import type { QueryClient, QueryKey } from '@tanstack/react-query'

/** Обработчик приложения (`onCreate`/`onUpdate`): результат `null` — пользователь отказался */
type AsyncHandler<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>

/** Обёртка обработчика: тот же вид, что у самого обработчика */
export type InvalidationWrapper = <TArgs extends unknown[], TResult>(
  handler: AsyncHandler<TArgs, TResult>,
) => AsyncHandler<TArgs, TResult>

/**
 * Оборачивает обработчик: после его резолва инвалидирует запросы и ЖДЁТ рефетча активных, и только
 * потом отдаёт результат полю. Порядок важен: пока список не обновился, только что созданная запись
 * исчезла бы из него вместе с подписью выбранного значения (правило «рефетч до возврата»).
 * Отказ пользователя (`null`) ничего не инвалидирует.
 */
export function wrapWithInvalidation<TArgs extends unknown[], TResult>(
  queryClient: QueryClient,
  keys: readonly QueryKey[],
  handler: AsyncHandler<TArgs, TResult>,
): AsyncHandler<TArgs, TResult> {
  return async (...args) => {
    const result = await handler(...args)
    if (result !== null && result !== undefined) {
      await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    }
    return result
  }
}
