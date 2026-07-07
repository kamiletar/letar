# Выполненные задачи — @letar/forms

## 2026-07-07 — Техдолг: rules-of-hooks в FieldDataGrid

- **`field-data-grid.tsx`** — `useMemo`/`useReactTable`/`useRef`/`useVirtualizer` вызывались внутри
  `{(arrayField) => {...}}` render-prop callback `<form.Field mode="array">` — реальное нарушение
  Rules of Hooks, не только придирка линтера. Заменено на `useField({ form, name, mode: 'array' })`
  верхнего уровня (тот же хук, на котором построен сам `<form.Field>`, поведение идентично) —
  все хуки теперь на верхнем уровне компонента.
- Заодно `eqeqeq`: `value != null` → явное сравнение с `null`/`undefined`.
- Обнаружено при аудите техдолга после планового `bun update` (сравнение typecheck/lint до/после
  показало, что ошибка предсуществующая, не от обновления зависимостей).
- Верификация: `nx run @letar/forms:oxlint` — чисто (кроме известного false-positive в
  `document-field-base.tsx`, не в этом файле), `typecheck:tsgo` и `test` — чисто.
- Публичный API (`DataGridFieldProps`) не менялся.

## v0.80.0 (2026-04-04) — DX фичи (Фаза 6)

- mapServerErrors() — автомаппинг Prisma/ZenStack/Zod ошибок (24 теста, 10M+ ops/sec)
- useFormHistory + HistoryControls — Undo/Redo Ctrl+Z/Y (3 теста)
- Form.Analytics — field-level аналитика + 4 адаптера (9 тестов, 25M+ ops/sec)
- FormReadOnlyView — режим чтения (9 render-тестов)
- FormSkeleton — loading state из Zod-схемы (5 тестов)
- FormComparison — diff-view (8 тестов)
- FormDependsOn — каскадный рендеринг

## v0.78.0 — Captcha + CreditCard

- Form.Captcha (Turnstile/reCAPTCHA/hCaptcha)
- Form.Field.CreditCard (brand detection, Luhn, SVG)

## v0.58.0 — Англификация + Address Provider

- 118 файлов переведены на английский
- Pluggable AddressProvider + DaData

## v0.50.0 — DRY/SOLID рефакторинг

- ~500 строк дублирования устранено
- SelectionFieldLabel, useGroupedOptions, zod-utils

## Фазы 1-5 (v0.1.0 — v0.50.0)

- 50+ field компонентов
- 20+ form-level компонентов
- Offline support, i18n, localStorage persistence
- TanStack Form DevTools интеграция
- createForm() фабрика с extraSelects/Comboboxes/Fields

---

**Последнее обновление:** 2026-04-04
