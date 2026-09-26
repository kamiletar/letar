import type { FieldDeps } from '@letar/forms-core/uikit'
import { useQueryClient } from '@tanstack/react-query'
import { type InvalidationKeys, type InvalidationWrapper, wrapWithInvalidation } from './invalidate'

/**
 * Обёртка для `onCreate`/`onUpdate` поля: после резолва обработчика инвалидирует запросы по ключам и
 * ждёт рефетча, затем возвращает опцию полю. Для обычных `useMutation` и `fetch`.
 *
 * Зависимое поле (§18.7): вместо списка ключей — функция от `ctx` действия (`onCreate(search, ctx)` /
 * `onUpdate(option, ctx)`); она получает `deps` родителей на момент начала и инвалидирует только список нужного
 * родителя, а не все.
 *
 * ⚠️ Хукам ZenStack (`useCreateX`/`useUpdateX`) обёртка не нужна — они инвалидируют сами; вторая
 * инвалидация лишь удвоит запросы.
 *
 * @example
 * ```tsx
 * const invalidateAfter = useInvalidateAfter([['users']])
 * <Form.Field.Combobox onCreate={invalidateAfter(async (name) => createUserDialog(name))} ... />
 *
 * // список сотрудников только той компании, в которой создали запись
 * const invalidateEmployees = useInvalidateAfter((ctx) => [['employees', ctx.deps.companyId]])
 * ```
 */
export function useInvalidateAfter<TDeps extends FieldDeps = FieldDeps>(
  queryKeys: InvalidationKeys<TDeps>,
): InvalidationWrapper {
  const queryClient = useQueryClient()
  return (handler) => wrapWithInvalidation(queryClient, queryKeys, handler)
}
