import { useQueryClient } from '@tanstack/react-query'
import { getQueryKey } from '@zenstackhq/tanstack-query/react'
import { type InvalidationWrapper, wrapWithInvalidation } from './lib/invalidate'
import {
  type OptionsQueryResult,
  type QueryOption,
  useQueryOptions,
  type UseQueryOptionsResult,
} from './lib/use-query-options'

/** Строка чтения ZenStack: при `optimisticUpdate: true` мутация кладёт в кэш временные записи с флагом `$optimistic` */
type ZenStackRow = { $optimistic?: boolean }

const isOptimisticRow = (row: ZenStackRow): boolean => row.$optimistic === true

/**
 * `useQueryOptions` для чтений ZenStack: строки `$optimistic` (временные записи оптимистичного режима самой
 * библиотеки, с чужим id) получают `pending` — видны, но не выбираются, иначе в форму попал бы фальшивый id.
 * Пока собственный `onCreate` поля в полёте, такая строка скрыта: почти всегда это та же запись (§16.7).
 *
 * @example
 * ```tsx
 * const categories = useZenStackOptions(client.workCategory.useFindMany(), (c) => ({ label: c.name, value: c.id }))
 * <Field.Select name="categoryId" {...categories.fieldProps} />
 * ```
 */
export function useZenStackOptions<
  TRow extends ZenStackRow,
  TOption extends QueryOption<string | number> = QueryOption,
>(
  result: OptionsQueryResult<TRow>,
  map: (row: TRow) => TOption,
): UseQueryOptionsResult<TRow, TOption> {
  return useQueryOptions(result, map, { isPending: isOptimisticRow })
}

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
