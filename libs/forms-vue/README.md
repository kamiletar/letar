# @letar/forms-vue

Тонкий Vue-адаптер `@letar/forms` — **архитектурный пруф**, а не полный порт (Фаза 7.8
`libs/forms/PLAN.md`). Доказывает, что `@letar/forms-core` действительно framework-agnostic
(DIP-граница, держится с 2026-07-08): 5 базовых полей поверх `@tanstack/vue-form`, ноль изменений
в `forms-core` под это не потребовалось.

⚠️ **Это НЕ полный порт** — 56 полей React-скина сюда не переносились и не планируются в этом
пакете. Здесь ровно то, что нужно для верификации границы + маленький подарок Vue-комьюнити.

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

### Поля (5 штук)

| Компонент       | Пропсы                                      | Значение схемы |
| --------------- | ------------------------------------------- | -------------- |
| `FieldInput`    | `name`, `label?`, `placeholder?`            | `string`       |
| `FieldTextarea` | `name`, `label?`, `placeholder?`            | `string`       |
| `FieldNumber`   | `name`, `label?`, `placeholder?`            | `number`       |
| `FieldCheckbox` | `name`, `label?`                            | `boolean`      |
| `FieldSelect`   | `name`, `label?`, `placeholder?`, `options` | `string`       |

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

## Что НЕ входит в скоуп

- **Не 56 полей** — только 5 (Input/Textarea/Number/Checkbox/Select). Остальные 51 в этом пакете
  не появятся без отдельного решения расширить скоуп (это был бы «второй Ark UI под Vue» —
  месяцы работы, заказчика на это нет).
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
