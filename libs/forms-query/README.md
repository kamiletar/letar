# @letar/forms-query

Интеграция [`@letar/forms`](../forms/) с TanStack Query: источники опций для `Field.Select` и `Field.Combobox`.
Пакет **не импортирует скины** — одинаково работает с Chakra-скином (`@letar/forms`) и shadcn-скином
(`@letar/forms-shadcn`). Ядро форм от TanStack Query не зависит: кому он не нужен, этот пакет не ставит.

```bash
bun add @letar/forms-query @tanstack/react-query
# ZenStack-часть (подпуть /zenstack): @zenstackhq/tanstack-query >=3 — необязательный peer
```

## Что внутри

| Экспорт                                                                   | Для чего                                                                                                                          |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `fromSearchQuery(useHook, { minChars? })`                                 | готовый `useQuery` для Combobox: `enabled` по `minChars`, `placeholderData: keepPreviousData`                                     |
| `fromSelectedQuery(useHook)`                                              | готовый `useSelected` Combobox: запись текущего значения, `enabled` по непустому значению                                         |
| `useQueryOptions(result, map)`                                            | результат запроса → `{ fieldProps: { options, loading }, error }` для Select/Combobox со статичными опциями                       |
| `@letar/forms-query/zenstack`: `useZenStackOptions(result, map)`          | `useQueryOptions`, где строки `$optimistic` ZenStack получают `pending` (видны, не выбираются)                                    |
| `useLoaderQuery(key, loadOptions, { minChars?, staleTime? })`             | промис-загрузчик (`loadOptions`: server action, `fetch`) → `useQuery` с ключом `[...key, search]`: кэш, дедупликация, инвалидация |
| `useInvalidateAfter(queryKeys)`                                           | обёртка `onCreate`/`onUpdate`: инвалидация и рефетч **до** возврата опции полю                                                    |
| `@letar/forms-query/zenstack`: `useInvalidateModels(models)`              | то же для мутаций мимо хуков ZenStack (server action, `$procs`)                                                                   |
| `@letar/forms-query/zenstack`: `useZenStackRelations(schema, formSchema)` | `relations` для `RelationFieldProvider` из самой form-схемы: `fieldProps.relation` → `useFindMany` модели                         |
| `collectRelations(formSchema)`                                            | те же справочники списком `{ model, labelField, paths }` — без ZenStack и TanStack Query, для своего источника данных             |

## Справочник целиком — Select

```tsx
import { useQueryOptions } from '@letar/forms-query'

const toOption = (region: Region) => ({ label: region.name, value: region.id }) // на уровне модуля

function RegionField() {
  const regions = useQueryOptions(useFindManyRegion(), toOption)
  return <Form.Field.Select name="regionId" {...regions.fieldProps} />
}
```

`data: row` кладётся в опцию сам (для `renderOption` и `onUpdate`). Ошибку запроса показывает приложение
(`regions.error`).

## Растущий справочник — Combobox

```tsx
import {
  fromSearchQuery,
  fromSelectedQuery,
  type SearchQueryOptions,
  type SelectedQueryOptions,
} from '@letar/forms-query'

// Хуки — на уровне модуля: правило хуков не разрешает вызывать их внутри стрелки в JSX
function useCategorySearch(search: string, options: SearchQueryOptions) {
  return useFindManyCategory({ where: { name: { contains: search, mode: 'insensitive' } }, take: 20 }, options)
}
function useCategoryById(id: string, options: SelectedQueryOptions) {
  return useFindUniqueCategory({ where: { id } }, options)
}
const searchCategories = fromSearchQuery(useCategorySearch)
const selectedCategory = fromSelectedQuery(useCategoryById)

<Form.Field.Combobox
  name="categoryId"
  useQuery={searchCategories}
  useSelected={selectedCategory}
  getLabel={(c) => c.name}
  getValue={(c) => c.id}
/>
```

Без обёрток запрос уходил бы с пустой строкой на каждом монтировании, а список мигал бы на каждом символе.

## Свой запрос без хука — `useLoaderQuery`

```tsx
<Form.Field.Combobox
  name="userId"
  useQuery={useLoaderQuery(['users'], (search, { signal }) => searchUsers({ search }, signal))}
  getLabel={(u) => u.name}
  getValue={(u) => u.id}
/>
// после мутации в любом месте: queryClient.invalidateQueries({ queryKey: ['users'] })
```

Кэш и инвалидация — то, чего у голого `loadOptions` нет; TanStack Query не нужен, если хватает `loadOptions` (он
встроен в Combobox: дебаунс, отмена, «Повторить»).

## Создание и правка записи из поля

```tsx
const invalidateAfter = useInvalidateAfter([['users']])

<Form.Field.Combobox onCreate={invalidateAfter(async (name) => openUserDialog({ name }))} … />
```

Обёртка ждёт рефетча активных запросов и только потом отдаёт опцию полю: пока список не обновился,
созданная запись исчезла бы из него вместе с подписью значения. Отказ пользователя (`null`) ничего не
инвалидирует.

⚠️ **Хукам ZenStack (`useCreateX`/`useUpdateX`) обёртка не нужна** — они инвалидируют сами; вторая инвалидация
удвоит запросы. Для мутаций мимо хуков (server action, процедура `$procs`) — `useInvalidateModels`:

```tsx
import { useInvalidateModels } from '@letar/forms-query/zenstack'

const invalidateModels = useInvalidateModels(['WorkCategory'])
<Form.Field.Combobox onCreate={invalidateModels(async (name) => createCategoryAction(name))} … />
```

Вложенные чтения других моделей (`include`/`select` из справочника) не ловятся — перечисляйте модели.

## Оптимистичный режим ZenStack

Хуки ZenStack с `optimisticUpdate: true` кладут в кэш временную запись с чужим id и флагом `$optimistic`. Без маркера
такая строка — выбираемый пункт с фальшивым id и дубль будущей записи. `useZenStackOptions` ставит маркер сам:

```tsx
import { useZenStackOptions } from '@letar/forms-query/zenstack'

const categories = useZenStackOptions(client.workCategory.useFindMany(), (c) => ({ label: c.name, value: c.id }))
const create = client.workCategory.useCreate({ optimisticUpdate: true })

<Form.Field.Select
  name="categoryId"
  {...categories.fieldProps}
  onCreate={async (search, { optimistic }) => {
    const input = await openCategoryDialog({ name: search })
    if (!input) { return null }
    optimistic({ label: input.name }) // окно закрыто — запись видна и выбрана сразу
    const created = await create.mutateAsync({ data: input }) // ответ сервера, а не input
    return { label: created.name, value: created.id, data: created }
  }}
/>
```

Строки `pending` видны приглушёнными, не выбираются и не правятся; пока собственный `create` поля в полёте, они скрыты.
Для своих маркеров — `useQueryOptions(result, map, { isPending: (row) => row.saving })`.

## `relations` из form-схемы — `useZenStackRelations`

`RelationFieldProvider` из `@letar/forms` подгружает опции полей со связью (`@meta("form.relation.*")`, `relationMeta()`),
но список `relations` приходилось писать руками: адаптер `useFindMany` на каждую модель. Хук строит его из схемы:

```tsx
import { schema } from '@/generated/schema'
import { useZenStackRelations } from '@letar/forms-query/zenstack'

// Вне компонента: литерал в JSX пересобирал бы массив на каждом рендере
const overrides = { Category: { queryArgs: { orderBy: { name: 'asc' } }, descriptionField: 'note' } }

const relations = useZenStackRelations(schema, RecipeCreateFormSchema, { overrides })
<RelationFieldProvider relations={relations}>…</RelationFieldProvider>
```

- Одна модель у нескольких полей грузится один раз; поля с ключом реестра `createForm` (`Select.Category`) пропускаются —
  такой компонент грузит данные сам.
- `overrides[Модель]` — `queryArgs`, `labelField`, `valueField`, `descriptionField`, `fieldProps`; `exclude` — модели, которые
  не грузить; `clientOptions` — второй аргумент `useClientQueries` (`endpoint`, `fetch`).
- Модели нет в схеме ZenStack — исключение со списком моделей. Два поля просят разные `labelField` одной модели —
  побеждает первое, в консоль уходит предупреждение.
- Первый аргумент — **схема ZenStack** (`schema` из `schema.ts`), а не результат `useClientQueries`: тот собирается заново на
  каждом рендере, и массив `relations` был бы каждый раз новым.

## Совместимость версий

Типы контракта опций (`@letar/forms-core`) вбандливаются и в скин, и в этот пакет — совпадение структурное.
Форма контракта меняется только в minor обоих пакетов сразу.

| `@letar/forms-query` | `@letar/forms` | `@letar/forms-shadcn` |
| -------------------- | -------------- | --------------------- |
| 0.1.x                | ≥ 2.23.0       | ≥ 0.44.0              |
| 0.2.x                | ≥ 2.24.0       | ≥ 0.45.0              |
| 0.3.x                | ≥ 2.27.0       | ≥ 0.46.0              |
| 0.4.x                | ≥ 2.27.0       | ≥ 0.46.0              |

Peer на `@letar/forms` не ставим: пользователь shadcn-скина не должен ставить Chakra-скин.
