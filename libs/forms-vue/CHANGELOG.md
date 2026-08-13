# Changelog @letar/forms-vue

## 0.2.0 (2026-08-13)

Фаза 9 (`libs/forms/PLAN.md`, тред `forms-vue-parity-phase9`), Этап 1 — начало паритета Vue-полей.
Архитектурное решение координатора: композиционный слой выделен в отдельный проверяемый подпуть.

- **Новый подпуть `@letar/forms-vue/core`** — `AppForm`, `createField`, `provideAppForm`,
  `useAppFormContext`, плюс новые `resolveFieldMeta`/`withFieldValidation`. Композиционная
  обвязка без единого конкретного поля — Vue-аналог роли `@letar/forms-react`. Корневой `.`
  экспорт не изменился (по-прежнему реэкспортирует всё, включая референсные HTML-поля).
- **ESLint-барьер** (`eslint.config.mjs`) запрещает файлам `src/core.ts`/`src/lib/core/**`
  импортировать что-либо из `src/lib/fields/**` — граница проверяемая, не на честном слове, тот
  же принцип, что уже защищает `forms-core`/`forms-react`.
- `resolveFieldMeta`/`withFieldValidation` — вынесены из `createField`, чтобы `forms-vue-shadcn`
  переиспользовал их вместо дублирования (было скопировано дословно в `createFieldPrimitives`).
- Физически: `app-form.ts`/`create-field.ts`/`form-context.ts` переехали в `src/lib/core/`;
  интеграционный тест (`AppForm` + все 5 полей вместе) остался в `src/lib/app-form.spec.ts` —
  он законно пересекает границу core/fields, поэтому не в `core/`.
- Публичное API `.` (корневого экспорта) не ломается — только добавление подпути.

Первый релиз — Фаза 7.8 `libs/forms/PLAN.md` (задача координатора форм `QuietRidge`, тред
`forms-phase7-3-shadcn`, письмо #58).

- `AppForm` — корневой компонент, `useForm` из `@tanstack/vue-form` + `provide`/`inject` контекста
  `{ form, schema }` полям.
- 5 полей: `FieldInput`, `FieldTextarea`, `FieldNumber`, `FieldCheckbox`, `FieldSelect`. Метки и
  плейсхолдеры читаются из `.meta({ ui: {...} })` через `@letar/forms-core/schema`
  (`getFieldMeta`) — тот же вызов, что использует React-скин.
- `createField(displayName, render)` — фабрика простых полей, Vue-эквивалент `createField` из
  `@letar/forms-react`.
- Валидация — `onChange` по `schema.shape[name]`, `@tanstack/vue-form` принимает Zod-схему
  напрямую (Standard Schema), без дополнительного адаптера.
- **Находка задачи:** `forms-core` не потребовал ни одного изменения — `getFieldMeta` и вся
  схемная часть уже были framework-agnostic. Граница DIP подтверждена.
- Тесты — vitest + `@vue/test-utils`, `libs/forms-vue/src/lib/app-form.spec.ts` (рендер меток из
  схемы, показ ошибки валидации, блокировка сабмита при невалидных данных, успешный сабмит,
  guard «поле вне `<AppForm>`»).
