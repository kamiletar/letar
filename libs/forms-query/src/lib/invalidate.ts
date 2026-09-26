import type { FieldDeps } from '@letar/forms-core/uikit'
import type { QueryClient, QueryKey } from '@tanstack/react-query'

/** Обработчик приложения (`onCreate`/`onUpdate`): результат `null` — пользователь отказался */
type AsyncHandler<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>

/** Обёртка обработчика: тот же вид, что у самого обработчика */
export type InvalidationWrapper = <TArgs extends unknown[], TResult>(
  handler: AsyncHandler<TArgs, TResult>,
) => AsyncHandler<TArgs, TResult>

/**
 * Контекст действия поля (второй аргумент `onCreate`/`onUpdate`), из которого форма-функция ключей берёт `deps`
 * родителей на момент начала действия (§18.7). Остальные поля контекста (`optimistic`) обёртке не нужны.
 */
export interface InvalidationContext<TDeps extends FieldDeps = FieldDeps> {
  deps: TDeps
}

/** Ключи инвалидации: готовый список либо функция от контекста действия (`(ctx) => [['employees', ctx.deps.companyId]]`) */
export type InvalidationKeys<TDeps extends FieldDeps = FieldDeps> =
  | readonly QueryKey[]
  | ((ctx: InvalidationContext<TDeps>) => readonly QueryKey[])

/**
 * Оборачивает обработчик: после его резолва инвалидирует запросы и ЖДЁТ рефетча активных, и только
 * потом отдаёт результат полю. Порядок важен: пока список не обновился, только что созданная запись
 * исчезла бы из него вместе с подписью выбранного значения (правило «рефетч до возврата»).
 * Отказ пользователя (`null`) ничего не инвалидирует.
 * `keys` — функция: зовётся после резолва обработчика со вторым его аргументом (`ctx` поля; без него — `{ deps: {} }`).
 */
export function wrapWithInvalidation<TArgs extends unknown[], TResult, TDeps extends FieldDeps = FieldDeps>(
  queryClient: QueryClient,
  keys: InvalidationKeys<TDeps>,
  handler: AsyncHandler<TArgs, TResult>,
): AsyncHandler<TArgs, TResult> {
  return async (...args) => {
    const result = await handler(...args)
    if (result !== null && result !== undefined) {
      const resolved = typeof keys === 'function' ? keys(contextFromArgs<TDeps>(args)) : keys
      await Promise.all(resolved.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    }
    return result
  }
}

/** Контекст поля — второй аргумент обработчика (`onCreate(search, ctx)`, `onUpdate(option, ctx)`) */
function contextFromArgs<TDeps extends FieldDeps>(args: readonly unknown[]): InvalidationContext<TDeps> {
  const ctx = args[1]
  if (ctx !== null && typeof ctx === 'object' && 'deps' in ctx) {
    return ctx as InvalidationContext<TDeps>
  }
  return { deps: {} as TDeps }
}
