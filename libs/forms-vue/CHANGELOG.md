# Changelog @letar/forms-vue

## 0.4.0 (2026-08-13)

Фаза 9, Этап 3 — маски/документы через `@letar/forms-core/mask` (10 новых полей).

- **Новый composable `useMaskField`** (`src/lib/core/use-mask-field.ts`, экспорт через
  `@letar/forms-vue/core`) — Vue-аналог React `useMaskField` (`forms-react`). Оборачивает
  `MaskController`/`format`/`unformat` из `forms-core/mask`. `'live'`-режим рендерит
  **неконтролируемый** `<input>` (`inputRef`, без `value`/`onInput` в vnode-данных) — DOM
  источник истины, `MaskController` пишет напрямую через `setRangeText`; `'blur'`/`'off'` —
  обычный контролируемый `<input>`. **Обязательно вызывать один раз в `setup()`**, не в
  render-замыкании — иначе `inputRef` терял бы идентичность между ре-рендерами и
  `MaskController` пересоздавался бы на каждое нажатие клавиши (в React ту же роль стабильности
  играет `useCallback` с зависимостями; в Vue её даёт сам `setup()`, выполняющийся один раз).
- **`createDocumentField(config)`** (`src/lib/fields/document-field-base.ts`) — фабрика
  документных полей, Vue-аналог `libs/forms-shadcn/.../document-field-base.tsx`.
- **10 новых полей:** `FieldMaskedInput` (маска общего назначения, WCAG 3.3.2
  `formatDescription` обязателен), `FieldPassport`, `FieldINN` (`formatMode: 'off'` — длина
  переменная, 10/12 цифр), `FieldKPP`, `FieldOGRN`, `FieldSNILS`, `FieldBIK`, `FieldBankAccount`,
  `FieldCorrAccount`, `FieldPhone` (форматтер `forms-core/phone`, НЕ через `useMaskField` — тот
  же выбор, что в React `field-phone.tsx`, WebKit-safe чистый JS).
- Контрольные суммы (ИНН/КПП/ОГРН/СНИЛС/БИК) — `@letar/forms-core/validators/ru`, портированы
  1:1 из React `document-field-base.tsx`-полей.
- Итог: 26 полей в headless-пакете (было 16). `FieldCreditCard` — компаунд-поле без
  `useMaskField` (форматтеры `forms-core/credit-card`) — сознательно отложено на отдельный заход,
  не входит в Этап 3.
- Тесты — `src/lib/app-form.spec.ts`, блок «Этап 3»: живое форматирование `FieldPassport`/
  `FieldMaskedInput` через реальный `MaskController` (не мок — `setValue()` из
  `@vue/test-utils` идёт по пути `commitFullReplace`, см. `controller.ts`), ошибка валидации
  `FieldINN`/`FieldCorrAccount`, форматирование `FieldPhone`.

## 0.3.0 (2026-08-13)

Фаза 9, Этап 1 (продолжение) — 11 новых нативных HTML-полей поверх `@letar/forms-vue/core`,
имена файлов подобраны 1:1 с React-скином (`libs/forms/src/lib/declarative/form-fields/**`) —
требование координатора для будущего сопоставления примеров по диску в `apps/form-docs`
(P7).

- **Новые поля:** `FieldNumberInput` (min/max/step), `FieldPassword` (переключатель видимости,
  локальный `ref`), `FieldSwitch`, `FieldRadioGroup`, `FieldNativeSelect`, `FieldHidden`
  (не рендерит DOM, синхронизирует `value` через `watch`), `FieldYesNo` (два кликабельных
  блока), `FieldDate`, `FieldTime`, `FieldCurrency`, `FieldPercentage`.
- Поля с пропсами сверх `name`/`label`/`placeholder` (min/max/step/options) собраны напрямую
  через `resolveFieldMeta`/`withFieldValidation` (как `FieldSelect` до них), не через
  `createField` — тот же паттерн, не новая абстракция.
- Итог: 16 полей в headless-пакете (было 5).
- Тесты — `src/lib/app-form.spec.ts`, блок «Этап 1»: рендер меток/контролов всех 11 полей,
  переключение видимости пароля, клик по `YesNo`, выбор в `RadioGroup`.

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
