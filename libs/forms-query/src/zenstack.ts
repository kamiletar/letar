import { useQueryClient } from '@tanstack/react-query'
import { getQueryKey, useModelQueries as createModelQueries } from '@zenstackhq/tanstack-query/react'
import { useMemo } from 'react'
import { collectRelations } from './lib/collect-relations'
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

/** Схема ZenStack (`schema` из сгенерированного `schema.ts`) */
export type ZenStackSchema = Parameters<typeof createModelQueries>[0]

/** Настройки клиента запросов ZenStack (второй аргумент `useClientQueries`: `endpoint`, `fetch`, …) */
export type ZenStackClientOptions = Parameters<typeof createModelQueries>[2]

/** Результат чтения справочника, который понимает `RelationFieldProvider` */
export interface ZenStackRelationQueryResult {
  data?: unknown[] | null
  isLoading: boolean
  error?: Error | null
}

/** Что можно поменять у справочника поверх собранного из form-схемы */
export interface ZenStackRelationOverride {
  /** Аргументы `useFindMany`: фильтр, сортировка */
  queryArgs?: unknown
  labelField?: string
  valueField?: string
  descriptionField?: string
  /** Общие `fieldProps` полей этой модели (`renderOption`, `onCreate`, `searchable`, …) */
  fieldProps?: Record<string, unknown>
}

/**
 * Конфигурация справочника для `RelationFieldProvider` (`relations={[…]}` из `@letar/forms`). Структурно совпадает с
 * его `RelationConfig`, поэтому пакет `@letar/forms` не импортируется.
 */
export interface ZenStackRelationConfig extends ZenStackRelationOverride {
  model: string
  useQuery: (args?: unknown) => ZenStackRelationQueryResult
  labelField: string
}

export interface UseZenStackRelationsOptions {
  /** Настройки по имени модели: `{ Category: { queryArgs: { orderBy: { name: 'asc' } } } }` */
  overrides?: Record<string, ZenStackRelationOverride>
  /** Модели, которые не загружать (поле получает опции другим способом) */
  exclude?: readonly string[]
  /** Те же настройки, что во втором аргументе `useClientQueries` */
  clientOptions?: ZenStackClientOptions
}

/**
 * `relations` для `RelationFieldProvider` из самой form-схемы: обходит поля с `fieldProps.relation`
 * (`@meta("form.relation.model", …)`, `relationMeta()`), берёт `useFindMany` модели из схемы ZenStack. Вместо
 * ручного списка `[{ model, useQuery: useFindManyCategory, labelField }]` с отдельным адаптером на каждую модель.
 *
 * Один справочник у нескольких полей грузится один раз. Поля с ключом реестра `createForm` (`Select.Category`)
 * пропускаются — такой компонент грузит данные сам. Модели нет в схеме ZenStack — исключение со списком моделей.
 *
 * ⚠️ Массив меняется, только когда меняются аргументы. `overrides`, `exclude` и `clientOptions` выноси за
 * компонент или в `useMemo`: литерал в JSX пересобирает массив на каждом рендере.
 *
 * @example
 * ```tsx
 * import { schema } from '@/generated/schema'
 *
 * const relations = useZenStackRelations(schema, RecipeCreateFormSchema)
 * <RelationFieldProvider relations={relations}>
 *   <Form schema={RecipeCreateFormSchema} …><Form.AutoFields /></Form>
 * </RelationFieldProvider>
 * ```
 */
export function useZenStackRelations(
  zenSchema: ZenStackSchema,
  formSchema: unknown,
  { overrides, exclude, clientOptions }: UseZenStackRelationsOptions = {},
): ZenStackRelationConfig[] {
  return useMemo(() => {
    const modelNames = Object.values(zenSchema.models).map((model) => model.name)

    return collectRelations(formSchema)
      .filter((relation) => !exclude?.includes(relation.model))
      .map((relation): ZenStackRelationConfig => {
        // Имя модели сверяем без учёта регистра — как это делает сам ZenStack
        const modelName = modelNames.find((name) => name.toLowerCase() === relation.model.toLowerCase())
        if (!modelName) {
          throw new Error(
            `useZenStackRelations: модели «${relation.model}» (поле «${relation.paths[0]}») нет в схеме ZenStack. `
              + `Доступные: ${modelNames.join(', ')}.`,
          )
        }
        // Фабрика без вызова хуков: `useFindMany` вызывается позже, из загрузчика провайдера
        const queries = createModelQueries(zenSchema, modelName as never, clientOptions)
        const { paths: _paths, ...collected } = relation

        return {
          ...collected,
          ...overrides?.[relation.model],
          model: relation.model,
          useQuery: (args) => queries.useFindMany(args as never) as unknown as ZenStackRelationQueryResult,
        }
      })
  }, [zenSchema, formSchema, overrides, exclude, clientOptions])
}
