# Field.Select теряет meta ui.options через .nullable().optional()

> ✅ **Исправлено 2026-08-26** (`@letar/forms-core` 0.9.2 → 0.9.3, `@letar/forms` 2.7.8) —
> см. раздел «Статус» ниже. Документ оставлен как разбор класса бага (Zod v4 registry
> keyed by identity), может повториться в другом месте той же природы.

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

## Причина (root cause)

`Form.Field.Select` без явного `options` берёт список из `resolved.options`
([field-select.tsx:70](/libs/forms/src/lib/declarative/form-fields/selection/field-select.tsx#L70)):

```ts
// useFieldState
const sourceOptions = componentProps.options ?? resolved.options ?? []
```

Сама enum-схема несёт корректный `.meta({ui:{options:[...]}})`. Настоящая причина — не в
`field-select.tsx`, а в резолвере меты (`@letar/forms-core`, `schema-meta.ts`/`schema-traversal.ts`):
Zod v4 хранит `.meta()` в глобальном registry, ключуясь по **идентичности объекта** схемы
(`registry._map.get(schema)`), а не разворачивая обёртки. `ZodOptional`/`ZodNullable` — новый
объект схемы поверх внутренней enum-схемы, и `.meta()` на этой обёртке не видит мету, повешенную
на внутреннюю схему до `.nullable()`/`.optional()`.

## Обходной путь (больше не нужен после фикса, оставлен для истории)

Передать `options` явно, собрав их из экспортированных лейблов enum-схемы:

```tsx
<AboiForm.Field.Select
  name="mood"
  label="Настроение"
  options={Object.entries(ProductMoodLabels).map(([value, label]) => ({ value, label }))}
/>
```

Применялся в `apps/aboi/src/app/[locale]/admin/products/_components/product-form.tsx` — можно
снять отдельным заходом aboi-dev, теперь `options` резолвятся из meta автоматически.

## Фикс

`getFieldMeta` (`libs/forms-core/src/lib/schema/schema-meta.ts`) и `getUIMeta` внутри
`traverseSchema` (`libs/forms-core/src/lib/schema/schema-traversal.ts`, используется
`FromSchema`/`AutoFields`) теперь пробуют `.meta()` сначала на схеме как есть, и только если там
пусто — на схеме, развёрнутой через `unwrapSchemaWithRequired`. Порядок проверки (сначала
как есть) намеренно сохраняет уже работавший случай `z.string().default('x').meta(...)`, где мета
висит на самой обёртке `.default()`, а не на внутренней схеме — если бы разворачивали всегда,
этот случай сломался бы в обратную сторону.

## Статус

✅ Закрыто 2026-08-26 (`@letar/forms-core` 0.9.2 → 0.9.3, `@letar/forms` 2.7.8) — подробности в
`libs/forms/CHANGELOG.md` и `libs/forms/PLAN.md` (Backlog, запись [2026-08-26], помечена
закрытой). Регресс-тесты — `schema-meta.spec.ts` (новый файл), кейс в `schema-traversal.spec.ts`.
