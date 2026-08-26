# Field.Select теряет meta ui.options через .nullable().optional()

## Симптом

`Form.Field.Select` без явного prop `options` рендерится пустым: `<select aria-hidden>` (native
fallback) без единого `<option>`, `chakra-select__valueText` — пустая строка даже при заданном
`field.state.value`, дропдаун при открытии пуст (переопределить значение через UI тоже нельзя).

При этом **само значение хранится и передаётся корректно** — submit/save работает, БД получает
верное значение. Ломается только отображение списка опций, что делает баг обманчивым: форма
выглядит рабочей до первой попытки открыть дропдаун или изменить значение через UI.

## Условие срабатывания

Поле в сгенерированной схеме обёрнуто в `.nullable().optional()` — стандартный вывод
`@letar/zenstack-form-plugin` для nullable enum-поля модели ZenStack. Например:

```ts
// apps/<app>/src/generated/form-schemas/<Model>.form.ts
mood: ProductMoodFormSchema.nullable().optional()
```

где `ProductMoodFormSchema` (из `enums/ProductMood.form.ts`) несёт валидный
`.meta({ ui: { options: [...] } })`.

## Причина

`Form.Field.Select` без явного `options` берёт список из `resolved.options`
([field-select.tsx:70](/libs/forms/src/lib/declarative/form-fields/selection/field-select.tsx#L70)):

```ts
// useFieldState
const sourceOptions = componentProps.options ?? resolved.options ?? []
```

Сама enum-схема несёт корректный `.meta({ui:{options:[...]}})`, но резолвер поля (то, что строит
`resolved`) не разворачивает `ZodNullable`/`ZodOptional` при поиске `.meta()` на вложенной схеме
— поэтому для `.nullable().optional()`-обёртки `resolved.options` приходит пустым массивом.

## Обходной путь

Передать `options` явно, собрав их из экспортированных лейблов enum-схемы:

```tsx
<AboiForm.Field.Select
  name="mood"
  label="Настроение"
  options={Object.entries(ProductMoodLabels).map(([value, label]) => ({ value, label }))}
/>
```

Образец применения — `apps/aboi/src/app/[locale]/admin/products/_components/product-form.tsx`.

## Предполагаемый фикс (для библиотеки, не применён)

В `useFieldState` разворачивать `ZodNullable`/`ZodOptional` (аналогично тому, как это, судя по
всему, уже делается для `resolved.required`/`resolved.disabled`) перед поиском `.meta()` на схеме
поля.

## Статус

Открытый backlog-пункт `@letar/forms` — `libs/forms/PLAN.md`, раздел «Backlog (запросы от
агентов)», запись [2026-08-26]. Класс дефекта общий: любое nullable/optional enum-поле в любом
приложении с `Form.Field.Select` без явного `options`.
