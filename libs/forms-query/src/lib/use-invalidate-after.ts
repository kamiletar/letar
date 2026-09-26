import { type QueryKey, useQueryClient } from '@tanstack/react-query'
import { type InvalidationWrapper, wrapWithInvalidation } from './invalidate'

/**
 * Обёртка для `onCreate`/`onUpdate` поля: после резолва обработчика инвалидирует запросы по ключам и
 * ждёт рефетча, затем возвращает опцию полю. Для обычных `useMutation` и `fetch`.
 *
 * ⚠️ Хукам ZenStack (`useCreateX`/`useUpdateX`) обёртка не нужна — они инвалидируют сами; вторая
 * инвалидация лишь удвоит запросы.
 *
 * @example
 * ```tsx
 * const invalidateAfter = useInvalidateAfter([['users']])
 * <Form.Field.Combobox onCreate={invalidateAfter(async (name) => createUserDialog(name))} ... />
 * ```
 */
export function useInvalidateAfter(queryKeys: readonly QueryKey[]): InvalidationWrapper {
  const queryClient = useQueryClient()
  return (handler) => wrapWithInvalidation(queryClient, queryKeys, handler)
}
