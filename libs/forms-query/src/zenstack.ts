import { useQueryClient } from '@tanstack/react-query'
import { getQueryKey } from '@zenstackhq/tanstack-query/react'
import { type InvalidationWrapper, wrapWithInvalidation } from './lib/invalidate'

/** Префикс ключей одной модели ZenStack: `['zenstack', '<Model>']` — `invalidateQueries` совпадает по префиксу */
export function modelQueryKey(model: string): readonly unknown[] {
  return getQueryKey(model, '', undefined).slice(0, 2)
}

/**
 * Обёртка для `onCreate`/`onUpdate`, чья мутация идёт МИМО хуков ZenStack (server action, процедура
 * `$procs`): после резолва инвалидирует все запросы перечисленных моделей и ждёт рефетча активных, и только
 * затем отдаёт результат полю.
 *
 * ⚠️ Хукам ZenStack (`useCreateX`/`useUpdateX`) обёртка не нужна — они инвалидируют сами.
 * ⚠️ Вложенные чтения других моделей (`include`/`select` из справочника) не ловятся — перечисляйте и их.
 *
 * @example
 * ```tsx
 * const invalidateModels = useInvalidateModels(['WorkCategory'])
 * <Form.Field.Combobox onCreate={invalidateModels(async (name) => createCategoryAction(name))} ... />
 * ```
 */
export function useInvalidateModels(models: readonly string[]): InvalidationWrapper {
  const queryClient = useQueryClient()
  return (handler) => wrapWithInvalidation(queryClient, models.map((model) => modelQueryKey(model)), handler)
}
