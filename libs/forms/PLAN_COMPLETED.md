# Выполненные задачи — @letar/forms

## 2026-08-09 — Фаза 7.1: расслоение forms-core, Этапы 1–3б

Делегировано `forms-coordinator` (thread `forms-phase7-1-core-split`). Создан новый Nx-проект
`libs/forms-core` — dependency-free ядро `@letar/forms` (Clean Architecture / DIP, решение Ками
2026-07-08). Три этапа закрыты, каждый отдельным коммитом с полным гейтом
(`typecheck:tsgo`/`test`/`lint` + `nx run-many -t typecheck:tsgo --all` по всему монорепо).

**Этап 1** — каркас `libs/forms-core` (теги `scope:shared`/`type:core`/`owner:letar`), пилотный
модуль `validators/ru` (476 строк, 9 файлов) перенесён целиком. Граница ядра держится на двух
ESLint-правилах: `depConstraints` (`type:core notDependOnLibsWithTags: ['type:ui']`) +
`no-restricted-imports` на `**/forms-core/src/**/*.ts` против `react`/`@chakra-ui/*`/
`@tanstack/react-*` — подтверждена негативной пробой (временный импорт Chakra в ядро валит
`nx lint forms-core`, без него — зелёный).

**Этап 2** — Zod-мета-движок (~2030 строк, 9 файлов: `schema-constraints`, `schema-traversal`,
`constraint-hints`, `common-meta`, `with-ui-meta`, `schema-meta`, `zod-utils`, `types/meta-types`,
`types/size-types`) под `@letar/forms-core/schema`. Карго-культный `'use client'` снят со всех —
чистые TS-функции без единого runtime-импорта фреймворка.

**Этап 3а/3б** — `server-errors/`, `utils/` (deepEqual+safeStringify), `security/file-security.ts`,
`offline/` (offline-service+types), `captcha/` (verify+types), `analytics/` (types+4 адаптера).
React-зависимые части (хуки, компоненты) остались в `libs/forms`.

**Ключевые находки** (детали и объяснения — в `PLAN.md` § Фаза 7.1):

- резолв `@letar/forms-core` в приложениях-потребителях требует ДВА независимых механизма
  одновременно: `paths` в `tsconfig.json` (~20 приложений) И реальная workspace-зависимость
  `"@letar/forms-core": "workspace:*"` в `libs/forms/package.json` + `bun install` — приложения
  вроде `dashboard` резолвят `@letar/forms` вообще без `paths`, только через `customConditions`;
- «framework-free» ≠ «platform-free»: `file-security.ts` (DOM API — Image/document/canvas) и
  `offline-service.ts` (динамический `await import('idb-keyval')`, не пойманный статическим
  грепом аудита) — framework-free, но требуют `lib: dom` в tsconfig ядра и `fake-indexeddb/auto`
  в его vitest-окружении, которого у `forms-core` изначально не было вовсе;
- ловушка TS6307 у приложений со «смешанной моделью» `include` (`animatrona`,
  `label-printer-desktop`) — нужен явный glob на `../../libs/forms-core/src/**/*.ts`.

Публичный API `@letar/forms` не изменился — все перенесённые модули стали тонкими
реэкспорт-шимами. Побочно найден и зафиксирован отдельной задачей (уже закрыт, см. запись выше)
баг Rules of Hooks в `document-field-base.tsx`.

**Остаток Фазы 7.1** (записан в `PLAN.md`, следующая сессия `/forms-dev`): Этапы 3в-3г
(credit-card/format-phone/table-utils/dadata «хвост», `i18n/create-form-error-map.ts`), Этап 4
(UIKit-контракт ~20 примитивов + перевод 3 пилотных полей), Этап 5 (документация 6 групп +
отчёт координатору).

## 2026-08-09 — Фаза 7.1: расслоение forms-core, Этап 3в-3г

Продолжение (thread `forms-phase7-1-core-split`). Перенесены пять оставшихся Chakra-free/React-free
модулей под новые subpath-экспорты `@letar/forms-core`:

- `./credit-card` — `luhn`, `detectBrand`/`getBrandInfo`, `formatExpiry`/`isExpiryValid`,
  `formatCardNumber`/`stripCardNumber`/`maxFormattedLength`, `creditCardSchema`. В `libs/forms`
  остались только Chakra-компоненты `CreditCardField`/`CardBrandIcon` (импортируют утилиты из
  `@letar/forms-core/credit-card` напрямую).
- `./phone` — `format-phone.ts` (чистый JS форматтер по маске, добавлен в v1.4.4 для фикса
  WebKit-бага с DOM-мутирующими mask-библиотеками). `field-phone.tsx` импортирует из
  `@letar/forms-core/phone`.
- `./table` — `table-utils.ts` целиком + Chakra/React-free часть `table-types.ts` (`TableColumnDef`,
  `CellFieldType`, `ResolvedColumn`, `TableFooterDef`, `CellCoord`, `TableNavigationState`).
  `TableEditorFieldProps`/`TableEditorContextValue` (используют `ReactNode`) остались в
  `libs/forms` и реэкспортируют чистые типы обратно — то же разделение, что и раньше для похожих
  React+Chakra компонентов.
- `./address` — `createDaDataProvider` + `AddressProvider`/`AddressSuggestion`/`SuggestionOptions`.
  `providers/index.ts` в `libs/forms` стал тонким реэкспорт-шимом (потребители `field-address.tsx`/
  `field-city.tsx`/`create-form.tsx` не поменялись — импортируют из локального `./providers`).
- `./i18n` — `createFormErrorMap` + `TranslateFunction`/`TranslateParams` (тип функции перевода).
  React Context (`FormI18nProvider`/`useFormI18n`) остался в `libs/forms/i18n`, импортирует типы и
  `createFormErrorMap` из `@letar/forms-core/i18n` и реэкспортирует их для обратной совместимости
  публичного пути `@letar/forms/i18n`.

**Находка:** `libs/forms/vitest.config.ts` резолвит `@letar/forms-core/*` НЕ через `node_modules`
(там симлинка вообще нет — резолв в приложениях идёт через `customConditions`/`exports`, но
`vitest.config.ts` библиотеки использует явный `resolve.alias` per-subpath), а вручную прописанным
`resolve.alias` на каждый subpath. Добавление нового subpath-экспорта в `forms-core/package.json`
без зеркальной записи в этом alias-массиве ломает **все** тесты `libs/forms` разом (66 из 98 файлов
упали на одной ошибке `Failed to resolve import "@letar/forms-core/i18n"") — потому что почти
каждый спек транзитивно тянет`libs/forms/src/index.ts`, а тот тянет`i18n`. Починка — добавить
alias`'@letar/forms-core/<subpath>': resolve(__dirname, '../forms-core/src/lib/<subpath>/index.ts')`одновременно с добавлением subpath в`forms-core/package.json`. Гейт:`nx run-many -t
typecheck:tsgo,test --projects=forms,forms-core` — 750/750 тестов, typecheck зелёный.

Публичный API `@letar/forms` не изменился — реэкспорт-шимы. Остаток: Этап 4 (UIKit-контракт) и
Этап 5 (документация 6 групп).

## 2026-08-09 — Техдолг: rules-of-hooks в document-field-base.tsx (не false-positive)

- **`createDocumentField`** (`document/document-field-base.tsx`, используется FieldInn/FieldOgrn/
  FieldBik/FieldSnils/FieldKpp) вызывал `useCallback` прямо в теле render-callback, переданного в
  `createField()` — та же категория нарушения Rules of Hooks, что и в `FieldDataGrid`
  (2026-07-07, см. запись ниже), только для одной хук-функции (`maskRef`), а не пяти.
- Запись от 2026-07-07 называла это «известным false-positive» — неверно: `oxlint`
  (`react-hooks(rules-of-hooks)`) указывал на реальную проблему, просто раньше её не чинили.
- Фикс — по паттерну "Field with local state" из JSDoc `create-field.tsx`: `maskRef` вынесен в
  `useFieldState` (второй параметр `createField()`, вызывается ДО `form.Field`, hooks-safe),
  наружу передаётся через `fieldState.maskRef`.
- Верификация: `nx lint forms` — `rules-of-hooks` для файла ушла (остались только
  предсуществующие `curly`, не в скоупе этой правки); `nx test forms` — зелёный; публичный API
  `createDocumentField`/`DocumentFieldConfig` не менялся.

## 2026-07-08 — Стратегия дистрибуции (Фаза 7) + Clean Architecture

Планировочная сессия (без изменений кода). Определено направление распространения `@letar/forms`
на широкую OSS-аудиторию — зафиксировано в `PLAN.md` → **Фаза 7** и в memory (`project_forms_distribution`).

- **Анализ рынка (веб):** рынок ушёл в Tailwind/shadcn (дефолт новых проектов); RHF доминирует форм-стейт;
  ниша schema-first zod→form открыта. **Chakra-лок = потолок охвата**, несовместим с целью «все React-devs».
- **Аудит связанности по коду:** вся Chakra в `declarative/` (153/177), 54/66 файлов полей тянут её напрямую;
  обёртка поля уже централизована в `form-fields/base/`. UIKit-интерфейс ≈ 20 примитивов. ~50 файлов уже
  Chakra-free (`validators` 9/9 чистый — идеальный первый кандидат в core).
- **Центральное решение (Clean Architecture / DIP):** `forms-core` **не импортирует ни один фреймворк** —
  фреймворк это деталь, зависимость идёт внутрь. React-адаптер — первый плагин.
- **Vue:** делаем **тонкий пруф-адаптер** (5–8 полей поверх `@tanstack/vue-form`) как тест на фальсификацию
  границы (второй потребитель доказывает, что абстракция настоящая), НЕ полный порт. Противовес записан:
  SOLID — слуга, не господин; предохранитель от speculative generality.
- **Roadmap:** 7.1 расслоение core → 7.2 standalone вне монорепо → 7.3 shadcn-beta (20 полей) → 7.4 замер →
  7.5 docs+SEO → 7.6 llms.txt/MCP → 7.7 open-core сервис → 7.8 Vue-пруф (после 7.1). Модель — open-core.
- **Следующий шаг:** 7.1 — TS-контракт UIKit + вынести `validators` в dependency-free core.

**Доработка воркфлоу (`.claude/commands/forms-dev.md`, коммит 6b38a76):** разбор показал, что `/forms-dev` не
лишний (концурренси-замок на `libs/forms` при многих параллельных сессиях), но устарел и не видел roadmap.
Исправлено: обязать читать `libs/forms/PLAN.md` целиком (не только Backlog) → активная фаза; расширить
file-reservations на будущие пакеты Фазы 7 (`forms-core` + скины + Vue); явно выделить, что доки
(`form-docs`) и примеры (`form-example`) — отдельные аппы и обязательны; версия 0.56→1.4, 40+→56 полей.

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

### Фикс типа Form.Field.Signature (2026-08-04)

`form-compound-types.ts`: тип поля `Signature` был вручную выписанным литералом,
разошедшимся с реальным `SignatureFieldProps` (объявлял несуществующие `penColor`/`mode`/
`readOnly`, не знал про рабочие `strokeColor`/`strokeWidth`/`allowTyped`/`typedFont`/
`exportFormat`). Рантайм-привязка была верной, ломался только typecheck потребителей
(`form-develop-app`). Заменён на прямую ссылку на `SignatureFieldProps`.

---

**Последнее обновление:** 2026-08-04
