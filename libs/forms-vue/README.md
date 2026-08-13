# @letar/forms-vue

Vue-адаптер `@letar/forms` поверх `@tanstack/vue-form`. Начинался как архитектурный пруф границы
(Фаза 7.8, DIP держится с 2026-07-08: `forms-core` не потребовал ни одного изменения под Vue).
С Фазы 9 (`libs/forms/PLAN.md`, 2026-08-13) координатор форм расширил задачу до полного паритета
с React-скином (61 поле) — не только пруф.

⚠️ **Ещё не полный порт** — 31 из 61 поля React-скина (Этапы 1–4 закрыты). Прогресс и план
оставшихся этапов — `libs/forms/PLAN.md`.

## Установка

Библиотека уже включена в монорепозиторий. Внешние зависимости — `vue` и `@tanstack/vue-form` —
peer dependencies, устанавливаются потребителем отдельно (в этом репо их ставит только сам
`forms-vue` как `devDependencies`, ни одно Next.js/React-приложение их не тянет).

```bash
bun add vue @tanstack/vue-form
```

## Быстрый старт

```vue
<script setup lang="ts">
import { AppForm, FieldCheckbox, FieldInput, FieldNumber, FieldSelect } from '@letar/forms-vue'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(2).meta({ ui: { title: 'Название', placeholder: 'Введите...' } }),
  rating: z.number().min(0).max(10).meta({ ui: { title: 'Рейтинг' } }),
  agree: z.boolean().meta({ ui: { title: 'Согласен с условиями' } }),
})

function handleSubmit(value: Record<string, unknown>) {
  console.log(value)
}
</script>

<template>
  <AppForm :schema="schema" :initial-value="{ title: '', rating: 5, agree: false }" :on-submit="handleSubmit">
    <FieldInput name="title" />
    <FieldNumber name="rating" />
    <FieldCheckbox name="agree" />
    <button type="submit">Сохранить</button>
  </AppForm>
</template>
```

Метки/плейсхолдеры читаются из той же `.meta({ ui: {...} })` Zod-схемы, что использует React-скин
— это и есть демонстрация общей границы: `@letar/forms-core/schema` не знает, кто её вызывает.

## API

### `<AppForm :schema :initial-value :on-submit>`

Корневой компонент. Заводит `@tanstack/vue-form` через `useForm`, отдаёт `form`+`schema` полям
через `provide`/`inject`. Сабмит — обычный `<form @submit>` с `preventDefault`.

### Поля (31 штука)

| Компонент             | Пропсы                                                                             | Значение схемы |
| --------------------- | ---------------------------------------------------------------------------------- | -------------- |
| `FieldInput`          | `name`, `label?`, `placeholder?`                                                   | `string`       |
| `FieldTextarea`       | `name`, `label?`, `placeholder?`                                                   | `string`       |
| `FieldNumber`         | `name`, `label?`, `placeholder?`                                                   | `number`       |
| `FieldNumberInput`    | `name`, `label?`, `placeholder?`, `min?/max?/step?`                                | `number`       |
| `FieldCheckbox`       | `name`, `label?`                                                                   | `boolean`      |
| `FieldSwitch`         | `name`, `label?`                                                                   | `boolean`      |
| `FieldSelect`         | `name`, `label?`, `placeholder?`, `options`                                        | `string`       |
| `FieldNativeSelect`   | `name`, `label?`, `placeholder?`, `options`                                        | `string`       |
| `FieldRadioGroup`     | `name`, `label?`, `options`, `orientation?`                                        | `string`       |
| `FieldPassword`       | `name`, `label?`, `placeholder?`, `defaultVisible?`                                | `string`       |
| `FieldHidden`         | `name`, `value?`                                                                   | любое          |
| `FieldYesNo`          | `name`, `label?`, `yesLabel?`, `noLabel?`                                          | `boolean`      |
| `FieldDate`           | `name`, `label?`, `placeholder?`, `min?/max?`                                      | `string`       |
| `FieldTime`           | `name`, `label?`, `placeholder?`, `min?/max?/step?`                                | `string`       |
| `FieldCurrency`       | `name`, `label?`, `placeholder?`, `currency?`                                      | `number`       |
| `FieldPercentage`     | `name`, `label?`, `placeholder?`, `min?/max?/step?`                                | `number`       |
| `FieldMaskedInput`    | `name`, `label?`, `mask`, `formatMode?`, `formatDescription`                       | `string`       |
| `FieldPassport`       | `name`, `label?`                                                                   | `string`       |
| `FieldINN`            | `name`, `label?`                                                                   | `string`       |
| `FieldKPP`            | `name`, `label?`                                                                   | `string`       |
| `FieldOGRN`           | `name`, `label?`                                                                   | `string`       |
| `FieldSNILS`          | `name`, `label?`                                                                   | `string`       |
| `FieldBIK`            | `name`, `label?`                                                                   | `string`       |
| `FieldBankAccount`    | `name`, `label?`                                                                   | `string`       |
| `FieldCorrAccount`    | `name`, `label?`                                                                   | `string`       |
| `FieldPhone`          | `name`, `label?`, `country?`, `autoUnmask?`                                        | `string`       |
| `FieldDateRange`      | `name`, `label?`, `startLabel?/endLabel?`, `min?/max?`, `presets?`, `orientation?` | `{start,end}`  |
| `FieldDateTimePicker` | `name`, `label?`, `minDateTime?/maxDateTime?`, `timeStep?`                         | `string`       |
| `FieldDuration`       | `name`, `label?`, `format?`, `min?/max?/step?`                                     | `number`       |
| `FieldSlider`         | `name`, `label?`, `min?/max?/step?`, `showValue?`                                  | `number`       |
| `FieldRating`         | `name`, `label?`, `count?`                                                         | `number`       |

Документные поля (`FieldPassport`…`FieldCorrAccount`) собраны через общую фабрику
`createDocumentField` (`src/lib/fields/document-field-base.ts`) поверх `useMaskField`
(`@letar/forms-vue/core`, движок `@letar/forms-core/mask`, контрольные суммы —
`@letar/forms-core/validators/ru`). `FieldPhone` — единственное исключение среди «масочных»
полей: форматирует через чистый JS-форматтер `@letar/forms-core/phone`, не через
`useMaskField`/`MaskController` (WebKit-safe, тот же выбор, что в React-скине).

`label`/`placeholder` необязательны — по умолчанию берутся из `schema.meta({ ui: {...} })` по
пути `name` (`getFieldMeta`, тот же вызов, что у React-скина). Валидация — `onChange` по
`schema.shape[name]`, `@tanstack/vue-form` принимает Zod-схему напрямую (Standard Schema).

Вёрстка полей — голый HTML с классами `letar-field`/`letar-field__label`/`letar-field__control`/
`letar-field__error`, без CSS и без UIKit-абстракции (см. «Что не входит в скоуп» ниже).

### `createField(displayName, render)`

Фабрика для собственных простых полей (тот же контракт, что у 5 встроенных) — Vue-эквивалент
`createField` из `@letar/forms-react`. `FieldSelect` под неё не подошёл (нужен доп. проп
`options`) и собран напрямую по тому же контексту, см. `src/lib/fields/field-select.ts`.

### `useAppFormContext()` / `provideAppForm()`

Низкоуровневый доступ к `{ form, schema }` — для полей, которым `createField` не подходит
(как `FieldSelect`).

### `useMaskField(options)` (Этап 3)

Composable движка масок `@letar/forms-core/mask` — Vue-аналог `useMaskField` из
`@letar/forms-react`. `'live'`-режим отдаёт неконтролируемый `<input>` (`inputRef` без
`value`/`onInput` в vnode-данных — DOM источник истины, `MaskController` пишет напрямую).
**Обязательно вызывать один раз в `setup()`** поля, не в render-замыкании — иначе `inputRef`
терял бы стабильную идентичность между ре-рендерами и `MaskController` пересоздавался бы на
каждое нажатие клавиши. Используется `createDocumentField` и `FieldMaskedInput`; экспортируется
через `@letar/forms-vue/core`.

## Что НЕ входит в скоуп

- **Не все 61 поле React-скина** — 31 (Фаза 9, Этапы 1–4: базовые/нативные HTML-поля,
  select-family, маски/документы, дата/число-виджеты). Остальные (тяжёлые peer-dep поля,
  survey/table) — следующие этапы плана Фазы 9 (`libs/forms/PLAN.md`).
- **`FieldCreditCard`** сознательно отложен из Этапа 3 (компаунд-поле без `useMaskField`,
  больше по объёму работы, чем остальные девять полей вместе) — следующий заход.
- **Нет UIKit-абстракции** (в отличие от `forms-react`+`forms`/`forms-shadcn`) — одна референсная
  реализация на голом HTML, без свопаемого дизайн-скина. Для пруфа границы этого достаточно.
- **Нет `Form.Group`/`Form.Steps`/массивов** — только плоские top-level поля.

## Подпуть `@letar/forms-vue/core` (Фаза 9)

Композиционный слой без единого конкретного поля — `AppForm`, `createField`, `provideAppForm`,
`useAppFormContext`, `resolveFieldMeta`, `withFieldValidation`. Vue-аналог роли, которую для React
играет `@letar/forms-react`: второй Vue-скин (`@letar/forms-vue-shadcn`) импортирует именно этот
подпуть, а не корневой `.` — так он не тянет референсные HTML-поля этого пакета.

```typescript
import { AppForm, createField, useAppFormContext } from '@letar/forms-vue/core'
```

Граница проверяется ESLint-правилом (`eslint.config.mjs`): файлам `src/core.ts`/`src/lib/core/**`
запрещено импортировать что-либо из `src/lib/fields/**` — тот же принцип, что уже защищает
границу `forms-core`/`forms-react` (`no-restricted-imports` + негативная проба линта, не
соглашение на честном слове).

## Команды

```bash
nx test forms-vue
nx lint forms-vue
nx typecheck:tsgo forms-vue
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/forms-vue` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/forms-vue` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).

## Связанные документы

- [libs/forms/PLAN.md](../forms/PLAN.md) — §7.8, стратегический контекст задачи
- [libs/forms-core/README.md](../forms-core/README.md) — framework-agnostic ядро, которое этот
  пакет проверяет на границу
- [libs/forms-react/README.md](../forms-react/README.md) — React-эквивалент того же контракта
  (`createField`, композиционный слой)
